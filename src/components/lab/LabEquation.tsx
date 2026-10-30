import { Formula } from '../Formula'

/** One equation card for a lab's equations strip: title, the relation, the numbers substituted, the result. */
export function LabEquation({ title, tex, sub, result, warn }: { title: string; tex: string; sub: string; result: string; warn?: string }) {
  return (
    <div className="lab-eq">
      <div className="lab-eq-title">{title}</div>
      <div className="mt-1 py-2" style={{ overflow: 'visible' }}>
        <Formula tex={tex} />
      </div>
      <div className="lab-eq-sub">{sub}</div>
      <div className="lab-eq-result">{result}</div>
      {warn && <div className="lab-accent mt-1">{warn}</div>}
    </div>
  )
}
