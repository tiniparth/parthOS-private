import { db } from "@/lib/supabase";
import SearchBox from "../SearchBox";

export const dynamic = "force-dynamic";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
function Row({ a, b }: { a: string; b?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
      <span className="flex-1">{a}</span>
      {b && <span className="shrink-0 text-xs text-muted-foreground">{b}</span>}
    </div>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const term = (q || "").trim();

  let tasks: any[] = [], notes: any[] = [], expenses: any[] = [], facts: any[] = [];
  if (term) {
    const sb = db();
    const like = `%${term}%`;
    const [t, n, e, f] = await Promise.all([
      sb.from("tasks").select("title,status,due_date").ilike("title", like).limit(25),
      sb.from("notes").select("content,created_at").ilike("content", like).limit(25),
      sb.from("expenses").select("amount,item,category,spent_on").ilike("item", like).limit(25),
      sb.from("memory_facts").select("fact,category").ilike("fact", like).limit(25),
    ]);
    tasks = t.data || []; notes = n.data || []; expenses = e.data || []; facts = f.data || [];
  }
  const total = tasks.length + notes.length + expenses.length + facts.length;

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight mb-4">Search</h1>
      <div className="mb-6"><SearchBox initial={term} /></div>

      {!term ? (
        <p className="text-sm text-muted-foreground">Type and hit Enter to search across everything.</p>
      ) : total === 0 ? (
        <p className="text-sm text-muted-foreground">No matches for “{term}”.</p>
      ) : (
        <div className="space-y-6">
          {tasks.length > 0 && <Section title={`Tasks (${tasks.length})`}>{tasks.map((t, i) => <Row key={i} a={t.title} b={`${t.due_date || ""} ${t.status}`.trim()} />)}</Section>}
          {expenses.length > 0 && <Section title={`Expenses (${expenses.length})`}>{expenses.map((e, i) => <Row key={i} a={`₹${e.amount} · ${e.item || "—"}`} b={`${e.category || ""} ${e.spent_on}`.trim()} />)}</Section>}
          {notes.length > 0 && <Section title={`Notes (${notes.length})`}>{notes.map((n, i) => <Row key={i} a={n.content} />)}</Section>}
          {facts.length > 0 && <Section title={`Memory (${facts.length})`}>{facts.map((f, i) => <Row key={i} a={f.fact} b={f.category || ""} />)}</Section>}
        </div>
      )}
    </>
  );
}
