import Hero from "@/components/Hero";
import HeroToHallsTransition from "@/components/HeroToHallsTransition";
import Decor from "@/components/Decor";
import Halls from "@/components/Halls";
import Gallery from "@/components/Gallery";
import Reels from "@/components/Reels";
import Manager from "@/components/Manager";
import Packages from "@/components/Packages";
import DatePrice from "@/components/DatePrice";
import RequestForm from "@/components/RequestForm";
import HowItWorks from "@/components/HowItWorks";
import Where from "@/components/Where";
import Faq from "@/components/Faq";
import Footer from "@/components/Footer";
import FloatingHeader from "@/components/FloatingHeader";
import ScrollReveal from "@/components/ScrollReveal";
import OrderRestore from "@/components/OrderRestore";
import StepToast from "@/components/StepToast";
import AnchorTuner from "@/components/AnchorTuner";
import { px } from "@/lib/px";

/**
 * Главная MyWish — Figma 914:193 (Frame 86, 1440 × 10633).
 *
 * Hero — полноэкранный видеоблок. Всё остальное лежит на одной сцене
 * шириной 1440 по координатам макета: в Figma страница собрана плоско,
 * абсолютным позиционированием, а художественные подложки перекрывают
 * границы секций. Отсчёт координат сцены — от нижнего края hero (макет y − 956).
 */

/** Полная высота макета минус hero. */
const STAGE_HEIGHT = 10633 - 956;

export default function Page() {
  return (
    <main id="main-content" tabIndex={-1}>
      <FloatingHeader />
      <ScrollReveal />
      <OrderRestore />
      <StepToast />
      {/* Только с ?anchors в адресе: подбор, где встают разделы при переходе. */}
      <AnchorTuner />
      <div id="hero-halls-transition" data-page-hero className="hero-halls-scene">
        <div className="hero-halls-sticky">
          <Hero />
          <HeroToHallsTransition />
        </div>
      </div>
      <div
        className="stage stage-after-hero-transition"
        style={{ height: px(STAGE_HEIGHT) }}
      >
        <Decor />
        <Halls />
        <Gallery />
        <Reels />
        <Manager />
        <Packages />
        <DatePrice />
        <RequestForm />
        <HowItWorks />
        <Where />
        <Faq />
        <Footer />
      </div>
    </main>
  );
}
