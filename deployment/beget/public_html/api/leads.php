<?php
require_once __DIR__ . '/_bootstrap.php';

mywish_require_post();

$transactionOpen = false;
try {
    $payload = mywish_request_json();
    if (mywish_text(isset($payload['website']) ? $payload['website'] : '', 100, false) !== '') {
        mywish_json_response(array('accepted' => true), 202);
    }
    if (!isset($payload['consent']) || $payload['consent'] !== true) {
        mywish_json_response(array('error' => 'Для отправки требуется согласие'), 400);
    }

    $quickCallbackForms = array(
        'hero_callback' => 'Главная – быстрый контакт с Ладой',
        'rental_callback' => 'Главная – быстрый контакт после расчёта аренды',
    );
    $formId = mywish_text(isset($payload['form_id']) ? $payload['form_id'] : 'home_request', 80, false);
    $isQuickCallback = isset($quickCallbackForms[$formId]);
    // The separate landing accepts a contact before a date is chosen.
    // Keep its optional details without changing the existing forms.
    $isPrazdnikForm = in_array($formId, array('prazdnik_request', 'main_dmitry_request'), true);
    $formLabel = $isQuickCallback
        ? $quickCallbackForms[$formId]
        : mywish_text(isset($payload['form_label']) ? $payload['form_label'] : 'Главная – расчёт события', 140, false);
    $eventDate = $isQuickCallback
        ? ''
        : mywish_text(isset($payload['event_date']) ? $payload['event_date'] : '', 10, false);
    $guests = $isQuickCallback
        ? 0
        : mywish_integer(isset($payload['guests']) ? $payload['guests'] : null, 1, 100);
    if ($isPrazdnikForm && (!isset($payload['guests']) || $payload['guests'] === '' || $payload['guests'] === 0)) {
        $guests = 0;
    }
    $name = mywish_text(isset($payload['name']) ? $payload['name'] : '', 80, false);
    $rawContact = mywish_text(isset($payload['contact']) ? $payload['contact'] : '', 240, false);
    $contact = mywish_extract_contact($rawContact);
    $hasValidContact = mywish_valid_contact($contact);
    $hall = $isQuickCallback
        ? 'help'
        : mywish_text(isset($payload['hall']) ? $payload['hall'] : 'help', 60, false);
    $tariff = $isQuickCallback
        ? 'help'
        : mywish_text(isset($payload['tariff']) ? $payload['tariff'] : 'style', 40, false);
    $baseEstimate = $isQuickCallback
        ? 0
        : mywish_integer(isset($payload['base_estimate']) ? $payload['base_estimate'] : null, 0, 10000000);
    $requestedContactChannel = mywish_text(isset($payload['contact_channel']) ? $payload['contact_channel'] : '', 40, false);
    $contactChannel = mywish_resolve_contact_channel($contact, $requestedContactChannel);

    if (
        $name === '' ||
        !$hasValidContact ||
        $baseEstimate === null ||
        (!$isQuickCallback && ((!($isPrazdnikForm && $eventDate === '') && !mywish_valid_event_date($eventDate)) || $guests === null))
    ) {
        mywish_json_response(array(
            'error' => $isQuickCallback
                ? 'Проверьте имя и контакт'
                : 'Проверьте дату, число гостей и контакт',
        ), 400);
    }

    $hallLabels = array(
        'flamingo' => 'Фламинго',
        'white' => 'Вайт',
        'black' => 'Блэк',
        'barbi' => 'Барби',
        'sicily' => 'Сицилия',
        'ocean-drive' => 'Оушен Драйв',
        'leonardo' => 'Леонардо',
        'santa-lucia' => 'Санта Лючия',
        'rubinhall' => 'Рубинхол',
        'help' => 'Помогите выбрать',
    );
    $tariffLabels = array(
        'light' => 'My Wish. Light',
        'style' => 'My Wish. Style',
        'prestige' => 'My Wish. Prestige',
    );
    if ($isPrazdnikForm) {
        $tariffLabels['happy'] = 'Хэппи';
        $tariffLabels['extra'] = 'Экстра';
        $tariffLabels['wow'] = 'Вау';
    }
    $utmSource = mywish_text(isset($payload['utm_source']) ? $payload['utm_source'] : '', 160, false);
    $yclid = mywish_text(isset($payload['yclid']) ? $payload['yclid'] : '', 128, false);
    $rawBucket = mywish_text(isset($payload['source_bucket']) ? $payload['source_bucket'] : '', 40, false);
    $sourceBucket = mywish_marketing_source_bucket($rawBucket, $utmSource, $yclid);
    $now = mywish_now();

    $record = array(
        ':event_date' => $eventDate,
        ':guests' => $guests,
        ':hall' => $hall !== '' ? $hall : 'help',
        ':hall_label' => isset($hallLabels[$hall]) ? $hallLabels[$hall] : 'Помогите выбрать',
        ':tariff' => $tariff !== '' ? $tariff : 'style',
        ':tariff_label' => isset($tariffLabels[$tariff]) ? $tariffLabels[$tariff] : 'Помогите выбрать',
        ':rate_group' => $isQuickCallback
            ? 'unknown'
            : mywish_text(isset($payload['rate_group']) ? $payload['rate_group'] : 'weekday', 40, false),
        ':base_estimate' => $baseEstimate,
        ':extras' => $isQuickCallback
            ? 'Быстрая заявка – детали праздника уточнит менеджер.'
            : mywish_text(isset($payload['extras']) ? $payload['extras'] : '', 200, false),
        ':name' => $name,
        ':contact' => $contact,
        ':contact_channel' => $contactChannel,
        ':contact_time' => mywish_text(isset($payload['contact_time']) ? $payload['contact_time'] : 'в любое время', 80, false),
        ':question' => $isQuickCallback
            ? 'Хочу обсудить дату, зал и стоимость праздника.'
            : mywish_text(isset($payload['question']) ? $payload['question'] : '', 1600, true),
        ':ruby_summary' => mywish_text(isset($payload['ruby_summary']) ? $payload['ruby_summary'] : '', 1600, true),
        ':form_id' => $formId,
        ':form_label' => $formLabel,
        ':source_bucket' => $sourceBucket,
        ':utm_source' => $utmSource,
        ':utm_medium' => mywish_text(isset($payload['utm_medium']) ? $payload['utm_medium'] : '', 160, false),
        ':utm_campaign' => mywish_text(isset($payload['utm_campaign']) ? $payload['utm_campaign'] : '', 240, false),
        ':utm_content' => mywish_text(isset($payload['utm_content']) ? $payload['utm_content'] : '', 240, false),
        ':utm_term' => mywish_text(isset($payload['utm_term']) ? $payload['utm_term'] : '', 240, false),
        ':yclid' => $yclid,
        ':ym_client_id' => preg_replace('/\D+/', '', mywish_text(isset($payload['ym_client_id']) ? $payload['ym_client_id'] : '', 32, false)),
        ':matched_keyword' => mywish_text(isset($payload['matched_keyword']) ? $payload['matched_keyword'] : '', 300, false),
        ':region_id' => preg_replace('/\D+/', '', mywish_text(isset($payload['region_id']) ? $payload['region_id'] : '', 16, false)),
        ':landing_path' => mywish_text(isset($payload['landing_path']) ? $payload['landing_path'] : '/', 500, false),
        ':consent_version' => mywish_text(isset($payload['consent_version']) ? $payload['consent_version'] : 'mywish-consent-draft-2026-07-27', 120, false),
        ':policy_version' => mywish_text(isset($payload['policy_version']) ? $payload['policy_version'] : 'mywish-privacy-draft-2026-07-27', 120, false),
        ':consented_at' => mywish_text(isset($payload['consented_at']) ? $payload['consented_at'] : $now, 60, false),
        ':created_at' => $now,
        ':updated_at' => $now,
    );

    $db = mywish_db();
    $requestId = mywish_text(isset($payload['request_id']) ? $payload['request_id'] : '', 80, false);
    if ($requestId !== '' && !preg_match('/^[A-Za-z0-9_-]{16,80}$/', $requestId)) {
        mywish_json_response(array('error' => 'Некорректный идентификатор заявки'), 400);
    }
    if ($requestId !== '') {
        $db->exec('CREATE TABLE IF NOT EXISTS lead_form_requests (
            request_id TEXT PRIMARY KEY NOT NULL,
            lead_id INTEGER NOT NULL,
            created_at TEXT NOT NULL
        )');
        // Commit the lead and its retry key together before calling external services.
        $db->exec('BEGIN IMMEDIATE');
        $transactionOpen = true;
        $lookup = $db->prepare('SELECT lead_id FROM lead_form_requests WHERE request_id = :request_id');
        $lookup->execute(array(':request_id' => $requestId));
        $existingId = $lookup->fetchColumn();
        if ($existingId) {
            $existing = mywish_find_lead(intval($existingId));
            $db->exec('COMMIT');
            $transactionOpen = false;
            if (!$existing) throw new RuntimeException('Missing saved lead');
            mywish_json_response(array(
                'accepted' => true,
                'leadNumber' => intval($existing['public_number']) > 0 ? intval($existing['public_number']) : intval($existingId),
                'telegramDelivered' => intval($existing['telegram_message_id']) > 0,
                'amocrmDelivered' => intval($existing['amo_lead_id']) > 0,
                'replayed' => true,
            ), 202);
        }
    }
    $statement = $db->prepare(
        'INSERT INTO leads (
            public_number, event_date, guests, hall, hall_label, tariff, tariff_label, rate_group,
            base_estimate, extras, name, contact, contact_channel, contact_time,
            question, ruby_summary, form_id, form_label, source_bucket, utm_source,
            utm_medium, utm_campaign, utm_content, utm_term, yclid, ym_client_id,
            matched_keyword, region_id, landing_path, consent_version, policy_version,
            consented_at, created_at, updated_at
        ) VALUES (
            (SELECT COALESCE(MAX(public_number), 0) + 1 FROM leads),
            :event_date, :guests, :hall, :hall_label, :tariff, :tariff_label, :rate_group,
            :base_estimate, :extras, :name, :contact, :contact_channel, :contact_time,
            :question, :ruby_summary, :form_id, :form_label, :source_bucket, :utm_source,
            :utm_medium, :utm_campaign, :utm_content, :utm_term, :yclid, :ym_client_id,
            :matched_keyword, :region_id, :landing_path, :consent_version, :policy_version,
            :consented_at, :created_at, :updated_at
        )'
    );
    $statement->execute($record);
    $leadId = intval($db->lastInsertId());
    if ($requestId !== '') {
        $saveRequest = $db->prepare('INSERT INTO lead_form_requests (request_id, lead_id, created_at) VALUES (:request_id, :lead_id, :created_at)');
        $saveRequest->execute(array(':request_id' => $requestId, ':lead_id' => $leadId, ':created_at' => $now));
        $db->exec('COMMIT');
        $transactionOpen = false;
    }
    $lead = mywish_find_lead($leadId);
    $delivered = mywish_deliver_lead($lead);
    $amoDelivered = mywish_deliver_lead_to_amocrm($lead);
    if ($amoDelivered === true) {
        mywish_retry_amocrm_pending($leadId);
    }
    $deliveryReady = $delivered && ($amoDelivered === null || $amoDelivered);

    mywish_json_response(array(
        'accepted' => true,
        'leadNumber' => isset($lead['public_number']) && intval($lead['public_number']) > 0
            ? intval($lead['public_number'])
            : $leadId,
        'telegramDelivered' => $delivered,
        'amocrmDelivered' => $amoDelivered,
    ), $deliveryReady ? 201 : 202);
} catch (Exception $error) {
    if ($transactionOpen && isset($db)) {
        try { $db->exec('ROLLBACK'); } catch (Exception $ignored) { }
    }
    error_log('MyWish lead submission failed');
    mywish_json_response(array('error' => 'Сейчас не удалось отправить заявку. Попробуйте ещё раз.'), 500);
}
