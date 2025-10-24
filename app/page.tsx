import Link from "next/link";

export default function Home() {
  return (
    <div className="ease-container space-y-10">
      {/* Today */}
      <section className="ease-card p-6">
        <h2 className="text-lg tracking-wide mb-4">Today</h2>
        <ul className="space-y-3">
          <TaskItem title="Outline onboarding flow" due="Today" />
          <TaskItem title="Refine Focus Mode UI" due="Tomorrow" />
          <TaskItem title="Write weekly review draft" due="Fri" />
        </ul>
        <div className="mt-6">
          <Link href="/focus" className="ease-outline-btn">Start Focus Mode</Link>
        </div>
      </section>

      {/* Progress */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="ease-card p-6">
          <p className="text-sm text-neutral-500 mb-2">Focus Sessions (this week)</p>
          <p className="text-4xl">8</p>
        </div>
        <div className="ease-card p-6">
          <p className="text-sm text-neutral-500 mb-2">Tasks Completed</p>
          <p className="text-4xl">12</p>
        </div>
      </section>

      {/* Weekly Review */}
      <section className="ease-card p-6">
        <h3 className="text-lg tracking-wide mb-4">Weekly Review</h3>

        {/* jemný infobox (Mist Blue na 12 %) */}
        <div className="rounded-[--r] border border-[--border] bg-[color:rgba(169,195,209,0.12)] p-4 mb-4">
          <p className="text-sm text-neutral-700">
            You made steady progress in structure and branding. Next: finalize Focus Mode and polish UX.
          </p>
        </div>

        <textarea
          placeholder="Write your note..."
          className="w-full min-h-[120px] rounded-[--r] border border-[--border] bg-white p-3 text-sm"
        />
        <div className="mt-4 flex justify-end">
          <button className="ease-outline-btn">Save Review</button>
        </div>
      </section>
    </div>
  );
}

function TaskItem({ title, due }: { title: string; due: string }) {
  return (
    <li className="flex items-center justify-between">
      <label className="inline-flex items-center gap-3">
        <input type="checkbox" className="h-4 w-4 rounded border-[--border]" />
        <span className="text-sm">{title}</span>
      </label>
      <span className="text-xs text-neutral-500">{due}</span>
    </li>
  );
}
