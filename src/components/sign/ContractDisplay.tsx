import { decorateContractHtml } from '@/lib/esign-tokens';
import { cn } from '@/lib/cn';
import {
  CONTRACT_STYLES,
  CONTRACT_FONT_LINKS,
  CONTRACT_LOGO_URL,
} from './contract-styles';

type Props = {
  /** Sanitized, token-substituted HTML produced by markdownToHtml. */
  renderedHtml: string;
  /** Optional outer wrapper class for page-level overrides. */
  className?: string;
  /** Tiny secondary letterhead line — typically the doc id or send date. */
  letterheadMeta?: string;
};

// Branded markdown renderer for executed agreements. Renders the verbatim
// rendered HTML stored on DocumentSignature, layered with red callout
// blocks and the cursive countersignature treatment via decorateContractHtml.
//
// Same component is reused as the central content of the signing page and
// of the admin "view signed agreement" detail. The PDF generator inlines
// the same `CONTRACT_STYLES` for visual parity.
export function ContractDisplay({ renderedHtml, className, letterheadMeta }: Props) {
  const decorated = decorateContractHtml(renderedHtml);
  return (
    <>
      {CONTRACT_FONT_LINKS.map((href) => (
        // eslint-disable-next-line @next/next/no-css-tags
        <link key={href} rel="stylesheet" href={href} />
      ))}
      <style dangerouslySetInnerHTML={{ __html: CONTRACT_STYLES }} />
      <div className={cn('contract-wrap', className)}>
        <header className="contract-letterhead">
          <img src={CONTRACT_LOGO_URL} alt="Maxxed Out" />
          {letterheadMeta && <p className="lh-meta">{letterheadMeta}</p>}
        </header>
        <article
          className="contract-display"
          dangerouslySetInnerHTML={{ __html: decorated }}
        />
      </div>
    </>
  );
}
