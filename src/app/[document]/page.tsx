import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL, type LegalId } from "@/lib/legal";
import { pageMetadata } from "@/lib/site";
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(LEGAL).map(document => ({ document })); }
function getDoc(id: string) { return Object.hasOwn(LEGAL, id) ? LEGAL[id as LegalId] : null; }
export async function generateMetadata({ params }: { params: Promise<{document: string}> }) { const {document} = await params; return pageMetadata(getDoc(document)?.title ?? "Документ", "/" + document); }
export default async function DocumentPage({ params }: { params: Promise<{document: string}> }) {
 const { document } = await params; const doc = getDoc(document); if (!doc) notFound();
 return <main id="main-content" tabIndex={-1} className="legal-page"><nav><Link href="/">MyWish</Link>{Object.entries(LEGAL).map(([key, value]) => <Link key={key} href={"/" + key}>{value.label}</Link>)}</nav><h1>{doc.title}</h1><p>{doc.lede}</p>{doc.sections.map((section, i) => <section key={i}>{section.h && <h2>{section.h}</h2>}{section.blocks.map((block, j) => "p" in block ? <p key={j}>{block.p}</p> : "ul" in block ? <ul key={j}>{block.ul.map((text, k) => <li key={k}>{text}</li>)}</ul> : <dl key={j}>{block.dl.map(([term, value], k) => <div key={k}><dt>{term}</dt><dd>{value}</dd></div>)}</dl>)}</section>)}<p>{doc.version}</p></main>;
}
