import PortfolioView from "../PortfolioView";

export const dynamic = "force-dynamic";

export default function PortfolioPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Portfolio</h1>
      <p className="text-sm text-muted-foreground mb-5">
        The public-site queue — nothing goes live on parth-index.vercel.app without your yes.
      </p>
      <PortfolioView />
    </>
  );
}
