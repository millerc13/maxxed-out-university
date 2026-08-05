/**
 * Buyer/lead name that deep-links to their GoHighLevel contact card in
 * a new tab. Falls back to plain text when we couldn't resolve a
 * contact id.
 */
export function ContactLink({ name, ghlUrl }: { name: string; ghlUrl: string | null }) {
  if (!ghlUrl) return <>{name}</>;
  return (
    <a
      href={ghlUrl}
      target="_blank"
      rel="noreferrer"
      className="font-medium text-[#3B5BDB] hover:underline"
      title="Open in GoHighLevel"
    >
      {name}
    </a>
  );
}
