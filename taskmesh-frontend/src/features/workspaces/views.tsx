"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { ArrowRight, CheckCircle2, Code2, Mic2, Sparkles } from "lucide-react";
import { Button, Card, EmptyState, SectionHeader } from "@/components/ui";

const benefits = ["A clear daily practice rhythm", "Submission formats that fit the work", "Structured evaluation when available", "A shared space for accountable growth"];

export function LandingPage() {
  return <main className="marketing-page home-page">
    <section className="home-hero"><div><p className="eyebrow">Practice with direction</p><h1>Make daily effort <em>visible.</em></h1><p>TaskMesh gives peer-driven initiatives a clear rhythm: practice deliberately, submit honestly, and use feedback to choose the next useful step.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild><Link href="/more">Explore initiatives <ArrowRight className="h-4 w-4" /></Link></Button><Button variant="outline" asChild><Link href="/about">Why TaskMesh</Link></Button></div></div><div className="hero-product" aria-label="TaskMesh product preview"><div className="hero-product-top"><span>Today’s focus</span><span className="live-dot">In rhythm</span></div><div className="hero-task"><div className="hero-icon"><Sparkles className="h-5 w-5" /></div><div><small>English initiative</small><strong>Speak with a clear point of view.</strong><p>One focused attempt. A useful next step.</p></div></div><div className="hero-flow"><span>Practice</span><i /><span>Submit</span><i /><span>Reflect</span></div><div className="hero-note">Progress is built from repeatable effort—not noisy dashboards.</div></div></section>
    <section className="home-section"><SectionHeader eyebrow="Start here" title="Two focused initiatives, designed for deliberate practice." /><div className="core-initiative-grid"><Link href="/english" className="core-initiative english"><Mic2 /><p>English initiative</p><h2>Speak with confidence.</h2><span>Daily speaking prompts, audio/video submission, and feedback-ready practice.</span><b>Explore English <ArrowRight className="h-4 w-4" /></b></Link><Link href="/dsa" className="core-initiative dsa"><Code2 /><p>DSA initiative</p><h2>Think in algorithms.</h2><span>Focused problem solving, thoughtful code submissions, and review-ready solutions.</span><b>Explore DSA <ArrowRight className="h-4 w-4" /></b></Link></div></section>
    <section className="home-section split-section"><div><p className="eyebrow">Why TaskMesh</p><h2>Consistency needs more than good intentions.</h2><p>Peer communities create energy. TaskMesh gives that energy a practical structure: a task, an attempt, a record of progress, and a clearer next move.</p></div><ul className="benefit-list">{benefits.map((item) => <li key={item}><CheckCircle2 className="h-4 w-4" />{item}</li>)}</ul></section>
    <section className="home-section"><SectionHeader eyebrow="The practice loop" title="A simple system for showing up." /><div className="practice-loop">{[["01", "Choose", "Open a focused daily challenge."], ["02", "Practice", "Work in the format the task requires."], ["03", "Submit", "Share a genuine attempt."], ["04", "Reflect", "Use evaluation and consistency signals."]].map(([number, title, copy]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>
    <section className="home-cta"><div><p className="eyebrow">Ready when you are</p><h2>Choose one initiative. Start with one honest attempt.</h2></div><Button asChild><Link href="/more">View initiatives <ArrowRight className="h-4 w-4" /></Link></Button></section>
  </main>;
}

export function SignInView() {
  return (
    <div className="auth-page">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Welcome back</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Continue with Google</h1>
        <p className="mt-3 text-sm text-slate-600">Sign in to access your initiatives, tasks, and progress tracking.</p>
        <Button className="mt-6 w-full justify-center" onClick={() => signIn("google", { callbackUrl: "/app/dashboard" })}>
          Continue with Google
        </Button>
      </div>
    </div>
  );
}

export function SignUpView() {
  return <SignInView />;
}

const participantCopy: Record<string, [string, string]> = {
  dashboard: ["Your practice space", "Choose an initiative to begin a focused practice session."], initiatives: ["Initiatives", "English and DSA are ready to explore. More tracks are on the roadmap."], tasks: ["Tasks", "Today’s published work will appear here."], submissions: ["Submissions", "Your submitted work will appear here when available."], evaluation: ["Evaluation", "Submit work to receive evaluation when your workspace is connected."], progress: ["Progress", "Your consistency and growth signals will appear here."], leaderboard: ["Leaderboard", "Rankings appear after participants complete published work."], groups: ["Groups", "Join a private group to add a cohort view."], notifications: ["Notifications", "Updates and evaluation notices will appear here."], profile: ["Profile", "Your account profile will appear here."], settings: ["Settings", "Workspace preferences will appear here."]
};

function ParticipantView({ slug }: { slug: string[] }) { const key = slug[0] ?? "dashboard"; const [title, description] = participantCopy[key] ?? participantCopy.dashboard; const action = key === "initiatives" ? <Button asChild><Link href="/more">Browse initiatives</Link></Button> : <Button asChild><Link href="/english">Open English</Link></Button>; return <div className="workspace-empty"><SectionHeader eyebrow="Participant workspace" title={title} description={description} action={action} /><Card className="mt-6"><EmptyState title={key === "groups" ? "No private group yet" : key === "tasks" ? "Today’s challenge hasn’t been published yet" : "Nothing to show yet"} description="This area is ready for live workspace data. The interface will update when the relevant records are available." /></Card></div>; }

function LeaderView({ slug }: { slug: string[] }) { const section = slug[0] ?? "dashboard"; return <div className="workspace-empty"><SectionHeader eyebrow="Leader workspace" title={section === "initiatives" ? "Initiatives" : "Initiative operations"} description="Manage live initiatives, participants, and review flows when the workspace data is connected." action={<Button asChild><Link href="/english">Preview English</Link></Button>} /><Card className="mt-6"><EmptyState title="No operational data yet" description="Initiative management, analytics, groups, and reports will appear here when backend data is available." /></Card></div>; }

export function AppRouterFrame({ role, slug }: { role: "student" | "leader"; slug: string[] }) { return role === "leader" ? <LeaderView slug={slug} /> : <ParticipantView slug={slug} />; }
