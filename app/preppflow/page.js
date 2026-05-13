'use client'
import { useEffect, useRef, useState } from 'react'
import './preppflow.css'

// ── Icons ──────────────────────────────────────────────────────────────────
const Arrow = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" {...p}><path d="M5 12h14M13 5l7 7-7 7"/></svg>
)
const Check = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" {...p}><path d="M4 12.5l5 5L20 6"/></svg>
)
const CheckSmall = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" width="10" height="10" {...p}><path d="M5 12.5l4 4L19 7"/></svg>
)
const FileText = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" {...p}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M8 13h8M8 17h6"/></svg>
)
const Mic = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" {...p}><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
)
const Video = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" {...p}><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>
)
const Chart = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" {...p}><path d="M3 21h18"/><path d="M6 17V11M11 17V7M16 17v-4M21 17V9"/></svg>
)
const Users = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" {...p}><circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/><path d="M21 19c0-2-1.5-3.5-4-3.7"/></svg>
)
const Sparkles = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22" {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l3 3M15.5 15.5l3 3M5.5 18.5l3-3M15.5 8.5l3-3"/></svg>
)
const Flame = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14" {...p}><path d="M13.5 1.5s.5 3-1.5 5.5-4 3-4 6.5a6 6 0 0 0 12 0c0-3-2-5-3-7.5-1 1.5-2.5 2-2.5 2S15 5 13.5 1.5z"/></svg>
)
const Calendar = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20" {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>
)
const Bell = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18" {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"/><path d="M10 21a2 2 0 0 0 4 0"/></svg>
)
const Home = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" {...p}><path d="M3 10l9-7 9 7v10a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/></svg>
)
const Target = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>
)
const Briefcase = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" {...p}><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/></svg>
)
const Compass = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16" {...p}><circle cx="12" cy="12" r="9"/><path d="M16 8l-2 6-6 2 2-6z"/></svg>
)
const Twitter = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" {...p}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25h6.83l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
)
const LinkedIn = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" {...p}><path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43A2.06 2.06 0 1 1 5.34 3.3a2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z"/></svg>
)
const Github = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" {...p}><path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.34-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.74.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.47.11-3.06 0 0 .97-.31 3.18 1.18a11.05 11.05 0 0 1 5.8 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.77.11 3.06.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.26 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.67.8.56C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z"/></svg>
)

// ── Reveal on scroll ───────────────────────────────────────────────────────
function Reveal({ children, delay = 0, as: As = 'div', className = '', style = {}, ...rest }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setShown(true); return }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { setShown(true); io.disconnect() } })
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <As
      ref={ref}
      className={`reveal ${shown ? 'in' : ''} ${className}`}
      style={{ '--rd': `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </As>
  )
}

// ── Animated progress bar ──────────────────────────────────────────────────
function AnimatedProgress({ value = 80, delay = 0, className = '' }) {
  const ref = useRef(null)
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { setTimeout(() => setW(value), delay); io.disconnect() } })
    }, { threshold: 0.4 })
    io.observe(el)
    return () => io.disconnect()
  }, [value, delay])
  return (
    <div ref={ref} className={`progress ${className}`}>
      <span style={{ width: `${w}%` }}></span>
    </div>
  )
}

// ── Nav ────────────────────────────────────────────────────────────────────
function Nav({ onJoinClick }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="container nav-inner">
        <a href="#" className="logo" aria-label="Preppflow home">Pre<span className="pp">pp</span>flow</a>
        <div className="nav-links">
          <a href="#how">How it works</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
        </div>
        <button className="btn btn-primary" onClick={onJoinClick}>Join Waitlist</button>
      </div>
    </nav>
  )
}

// ── Hero Dashboard Mockup ──────────────────────────────────────────────────
function HeroDashboard() {
  const [streak, setStreak] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setStreak(s => (s < 12 ? s + 1 : 12)), 90)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="dash">
      <div className="dash-top">
        <div className="dots"><span></span><span></span><span></span></div>
        <div className="url">app.preppflow.com / dashboard</div>
        <Bell />
      </div>
      <div className="dash-body">
        <aside className="dash-side">
          <div className="group">Workspace</div>
          <a href="#" className="active"><Home /> Dashboard</a>
          <a href="#"><FileText /> Resume</a>
          <a href="#"><Mic /> Interview Prep</a>
          <a href="#"><Video /> Mock Interviews</a>
          <a href="#"><Chart /> Market Intel</a>
          <div className="group">This week</div>
          <a href="#"><Target /> Goals</a>
          <a href="#"><Briefcase /> Applications</a>
          <a href="#"><Compass /> Career Map</a>
        </aside>
        <div className="dash-main">
          <div className="dash-row">
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Good morning, Aanya</div>
              <h4>Your 4-week interview sprint</h4>
            </div>
            <div className="dash-streak"><Flame style={{ color: 'var(--amber)' }} /> <span>{streak}-day streak</span></div>
          </div>

          <div className="weeks">
            <div className="week-tile done">
              <div className="check"><CheckSmall /></div>
              <div className="lbl">Week 1</div>
              <div className="ttl">Resume Builder</div>
              <div className="progress"><span style={{ width: '100%' }}></span></div>
            </div>
            <div className="week-tile done">
              <div className="check"><CheckSmall /></div>
              <div className="lbl">Week 2</div>
              <div className="ttl">Interview Prep</div>
              <div className="progress"><span style={{ width: '100%' }}></span></div>
            </div>
            <div className="week-tile active">
              <div className="lbl">Week 3 · Active</div>
              <div className="ttl">Video Mock</div>
              <AnimatedProgress value={65} delay={300} />
            </div>
            <div className="week-tile">
              <div className="lbl">Week 4</div>
              <div className="ttl">Career Intel</div>
              <div className="progress"><span style={{ width: '0%' }}></span></div>
            </div>
          </div>

          <div className="dash-today">
            <div className="row">
              <div className="icon-box"><Video /></div>
              <div style={{ flex: 1 }}>
                <h5>Today&apos;s session · Behavioral round</h5>
                <div className="meta">5 min · Product Manager track</div>
              </div>
              <span className="badge">In progress</span>
            </div>
            <div className="ring-row">
              <div className="ring" style={{ '--p': 60 }}>
                <div className="num">3 of 5<small>questions</small></div>
              </div>
              <div className="tasks">
                <div className="task done"><div className="check-circle"></div> Warm up · 2 min</div>
                <div className="task done"><div className="check-circle"></div> Tell me about yourself</div>
                <div className="task done"><div className="check-circle"></div> Lead through ambiguity</div>
                <div className="task"><div className="check-circle"></div> Conflict with stakeholder</div>
                <div className="task"><div className="check-circle"></div> Wrap-up &amp; feedback</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Hero ───────────────────────────────────────────────────────────────────
function Hero({ onJoinClick, scrollTo }) {
  return (
    <section className="hero">
      <div className="container hero-inner">
        <Reveal>
          <span className="badge"><span className="dot"></span> Early access open · Limited spots</span>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="t-hero">Five minutes a day<br/>to your next role.</h1>
        </Reveal>
        <Reveal delay={160}>
          <p className="sub">
            Preppflow gets busy professionals interview-ready through short daily sessions. AI resume building, personalised interview prep, and market intelligence, all in one place.
          </p>
        </Reveal>
        <Reveal delay={240}>
          <div className="hero-ctas">
            <button className="btn btn-primary btn-lg" onClick={onJoinClick}>
              Join the Waitlist
              <Arrow />
            </button>
            <a className="text-link" href="#how" onClick={(e) => { e.preventDefault(); scrollTo('how') }}>
              See how it works <Arrow />
            </a>
          </div>
        </Reveal>
        <Reveal delay={320}>
          <div className="hero-proof">
            <span className="avatars"><span></span><span></span><span></span><span></span></span>
            <span>Join <b style={{ color: 'var(--text)' }}>500+ professionals</b> already on the waitlist.</span>
          </div>
        </Reveal>
      </div>
      <Reveal delay={400} className="hero-mock-wrap">
        <HeroDashboard />
      </Reveal>
    </section>
  )
}

// ── Problem Section ────────────────────────────────────────────────────────
function ProblemSection() {
  const cards = [
    { stat: '55%', title: 'of professionals are not interview ready', text: 'Most discover the gap only after their first rejection.' },
    { stat: '1 in 6', title: 'switches or faces layoffs every year', text: 'A surprise call can rewrite your year. Preparation cannot wait.' },
    { stat: 'Only 32%', title: 'feel confident walking into an interview', text: 'Skills are not the gap. Practice, structure and feedback are.' },
  ]
  return (
    <section className="section">
      <div className="container">
        <Reveal className="section-head">
          <div className="t-eyebrow eyebrow">The reality</div>
          <h2 className="t-h1">Sound familiar?</h2>
          <p>Career moves happen faster than ever, and most of us only start preparing once we are already behind.</p>
        </Reveal>
        <div className="problem-grid">
          {cards.map((c, i) => (
            <Reveal key={i} delay={i * 100} className="card hover problem-card">
              <span className="badge amber"><span className="dot"></span> Sound familiar?</span>
              <div className="stat" style={{ marginTop: 16 }}>{c.stat}</div>
              <h3 className="t-h3">{c.title}</h3>
              <p>{c.text}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How It Works ───────────────────────────────────────────────────────────
function HowItWorksSection() {
  const steps = [
    { week: 'Week 1', title: 'Resume Builder', body: 'AI rewrites and quantifies your story for the roles you actually want.', pct: 100, state: 'done' },
    { week: 'Week 2', title: 'Interview Prep', body: 'Daily 5-minute drills on behavioural, technical and case questions.', pct: 100, state: 'done' },
    { week: 'Week 3', title: 'Video Mock', body: 'Realistic on-camera mocks with feedback on content, pace and clarity.', pct: 65, state: 'active' },
    { week: 'Week 4', title: 'Career Intelligence', body: 'Salary benchmarks, hiring trends and warm intros for your shortlist.', pct: 0, state: 'locked' },
  ]
  return (
    <section className="section how" id="how">
      <div className="container">
        <Reveal className="section-head">
          <div className="t-eyebrow eyebrow">How it works</div>
          <h2 className="t-h1">Four focused weeks. Twenty short sessions.</h2>
          <p>A guided journey, not a content dump. Every step builds on the last so you finish ready, not exhausted.</p>
        </Reveal>
        <div className="steps">
          {steps.map((s, i) => (
            <Reveal key={i} delay={i * 120} className={`step ${s.state === 'locked' ? 'locked' : ''}`}>
              <div className="step-num">{i + 1}</div>
              <div className="week">{s.week}</div>
              <h4>{s.title}</h4>
              <p>{s.body}</p>
              <div className="progress-row">
                <AnimatedProgress value={s.pct} delay={300 + i * 120} />
                <span className="pct" style={{
                  color: s.state === 'done' ? 'var(--emerald)' : s.state === 'active' ? 'var(--indigo)' : 'var(--text-muted)'
                }}>
                  {s.pct}%
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Features ───────────────────────────────────────────────────────────────
function FeaturesSection() {
  const feats = [
    { Icon: FileText, title: 'AI Resume Builder', body: 'Add one achievement a day and get a polished, ATS-ready resume in a week.' },
    { Icon: Mic, title: 'Personalised Interview Prep', body: 'One question a day, tailored to your role and target company.' },
    { Icon: Video, title: 'Video Mock Interviews', body: 'Record, review, and improve your articulation and confidence.' },
    { Icon: Chart, title: 'Salary Benchmarking', body: 'Know exactly what the market pays for your skills today.', green: true },
    { Icon: Users, title: 'Networking Intelligence', body: 'Warm introductions to people at your target companies.' },
    { Icon: Sparkles, title: 'Prep Companion', body: 'A friend who tracks your progress and keeps you accountable.', green: true },
  ]
  return (
    <section className="section" id="features">
      <div className="container">
        <Reveal className="section-head">
          <div className="t-eyebrow eyebrow">Features</div>
          <h2 className="t-h1">Everything you need, nothing you don&apos;t.</h2>
          <p>One platform across the full job-switch journey, from rewriting your resume to negotiating the offer.</p>
        </Reveal>
        <div className="features-grid">
          {feats.map((f, i) => (
            <Reveal key={i} delay={(i % 3) * 100} className={`card hover feature ${f.green ? 'green' : ''}`}>
              <div className="icon-box"><f.Icon /></div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Habit Phone Mockup ─────────────────────────────────────────────────────
function HabitPhone() {
  const days = [
    { l: 'M', s: 'done' }, { l: 'T', s: 'done' }, { l: 'W', s: 'done' },
    { l: 'T', s: 'done' }, { l: 'F', s: 'today' }, { l: 'S', s: '' }, { l: 'S', s: '' },
    { l: '8', s: 'done' }, { l: '9', s: 'done' }, { l: '10', s: 'done' }, { l: '11', s: 'done' },
    { l: '12', s: 'done' }, { l: '13', s: 'miss' }, { l: '14', s: 'done' },
    { l: '15', s: 'done' }, { l: '16', s: 'done' }, { l: '17', s: 'done' }, { l: '18', s: 'done' },
    { l: '19', s: 'done' }, { l: '20', s: 'done' }, { l: '21', s: 'today' },
  ]
  return (
    <div className="phone">
      <div className="notch"></div>
      <div className="screen">
        <div className="phone-screen">
          <div className="top-row">
            <div>
              <div className="greet">Hey Aanya 👋</div>
              <div style={{ fontSize: 11, color: 'var(--text-2)' }}>Friday · 5 min session ready</div>
            </div>
            <span className="badge emerald"><span className="dot"></span> On track</span>
          </div>

          <div className="streak-strip">
            <span className="flame">🔥</span>
            <div style={{ flex: 1 }}>
              <div className="streak-num">12</div>
              <div className="streak-lbl">Day streak</div>
            </div>
          </div>

          <div className="session-card">
            <div className="session-row">
              <div className="text">
                <span className="pill">Today</span>
                <h6>STAR-style behavioral drill</h6>
                <div className="small">5 min · 3 of 5 questions</div>
              </div>
              <div className="ring-mini">
                <span className="lab">60%</span>
              </div>
            </div>
          </div>

          <div className="phone-cal">
            <h6>Weekly progress</h6>
            <div className="cal-grid">
              {days.map((d, i) => (
                <div key={i} className={`day ${d.s}`}>{d.l}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Habit Section ──────────────────────────────────────────────────────────
function HabitSection() {
  return (
    <section className="section habit">
      <div className="container">
        <div className="habit-grid">
          <Reveal className="habit-left">
            <div className="t-eyebrow eyebrow" style={{ marginBottom: 14 }}>The daily habit</div>
            <h2 className="t-h1">Five minutes a day <span style={{ color: 'var(--indigo)' }}>keeps the panic away.</span></h2>
            <p>Small daily sessions compound into full interview readiness. No overwhelm, no pressure, just steady progress.</p>

            <div className="habit-list">
              <Reveal delay={80} className="habit-item">
                <div className="ico"><Calendar /></div>
                <div>
                  <h4>One short session, every day</h4>
                  <p>5-minute drills designed around your role, level and energy.</p>
                </div>
              </Reveal>
              <Reveal delay={160} className="habit-item">
                <div className="ico"><Flame style={{ width: 20, height: 20 }} /></div>
                <div>
                  <h4>Streaks that respect your week</h4>
                  <p>Skip-day forgiveness, weekend lite mode, and a streak that actually motivates.</p>
                </div>
              </Reveal>
              <Reveal delay={240} className="habit-item">
                <div className="ico"><Target style={{ width: 20, height: 20 }} /></div>
                <div>
                  <h4>Visible progress to the offer</h4>
                  <p>See exactly how ready you are for each company in your shortlist.</p>
                </div>
              </Reveal>
            </div>
          </Reveal>

          <Reveal delay={120} className="center">
            <HabitPhone />
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ── Social Proof ───────────────────────────────────────────────────────────
function SocialProofSection() {
  const stats = [
    { num: '65M+', label: 'white collar professionals in India', accent: true },
    { num: '55%', label: 'not interview ready today' },
    { num: '3 to 4 weeks', label: 'to full interview readiness with Preppflow', accent: true },
  ]
  return (
    <section className="section proof">
      <div className="container">
        <div className="proof-grid">
          {stats.map((s, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className="proof-stat">
                <span className={s.accent ? 'accent' : ''}>{s.num}</span>
              </div>
              <div className="proof-label">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Pricing ────────────────────────────────────────────────────────────────
function PricingSection({ onJoinClick }) {
  const plans = [
    {
      name: 'Free',
      price: 'Free', sub: '',
      tagline: 'Get started at no cost',
      features: [
        'Resume health check',
        '3 interview prep sessions / week',
        '1 video mock per month',
        'Community templates',
      ],
      cta: 'Get started',
    },
    {
      name: 'Pro',
      price: '₹499', sub: 'per month',
      tagline: 'For active job seekers.',
      features: [
        'Everything in Free',
        'Unlimited interview prep',
        'Unlimited video mocks with AI feedback',
        'Salary benchmarking by role and city',
        'Personalised weekly plan',
        'Priority support',
      ],
      cta: 'Join Waitlist',
      featured: true,
    },
    {
      name: 'Annual',
      price: '₹2,499', sub: 'per year',
      tagline: 'Best value for the long-term career builder.',
      features: [
        'Everything in Pro',
        'Quarterly career review',
        'Networking intelligence access',
        '12 months of updates',
        'Locked-in early-access price',
      ],
      cta: 'Join Waitlist',
      saveBadge: 'Save 58%',
    },
  ]
  return (
    <section className="section" id="pricing">
      <div className="container">
        <Reveal className="section-head">
          <div className="t-eyebrow eyebrow">Pricing</div>
          <h2 className="t-h1">Less than a single coaching call.</h2>
          <p>Honest, flat pricing. Cancel anytime. Early-access pricing locked in for life.</p>
        </Reveal>

        <div className="pricing-grid">
          {plans.map((p, i) => (
            <Reveal key={i} delay={i * 120} className={`price-card ${p.featured ? 'featured' : ''}`}>
              {p.featured && (
                <div className="band">
                  <span>Pro</span>
                  <span className="badge amber" style={{ height: 22, padding: '0 10px', fontSize: 10 }}>Most Popular</span>
                </div>
              )}
              {!p.featured && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <h3>{p.name}</h3>
                  {p.saveBadge && (
                    <span className="badge amber" style={{ height: 22, padding: '0 10px', fontSize: 10 }}>{p.saveBadge}</span>
                  )}
                </div>
              )}
              <div className="price">{p.price}{p.sub && <small> {p.sub}</small>}</div>
              <p className="tagline">{p.tagline}</p>
              <ul>
                {p.features.map((f, j) => (
                  <li key={j}>
                    <span className="check"><Check /></span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <button className={`btn ${p.featured ? 'btn-primary' : 'btn-secondary'}`} onClick={onJoinClick}>
                {p.cta}
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Waitlist CTA ───────────────────────────────────────────────────────────
function WaitlistSection({ formRef, email, setEmail, submitted, onSubmit }) {
  return (
    <section className="section cta-section" id="waitlist" ref={formRef}>
      <div className="container">
        <div className="cta-inner">
          <Reveal>
            <span className="badge" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
              <span className="dot"></span> Early access · No credit card
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h2>Be among the first to get access.</h2>
          </Reveal>
          <Reveal delay={160}>
            <p>Free early access for waitlist members. No spam. Cancel anytime.</p>
          </Reveal>
          <Reveal delay={240}>
            {submitted ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: 'rgba(255,255,255,0.16)', color: '#fff',
                padding: '14px 22px', borderRadius: 10, fontWeight: 600
              }}>
                <Check /> You&apos;re on the list. We&apos;ll be in touch soon.
              </div>
            ) : (
              <form className="cta-form" onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
                <input
                  className="input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                />
                <button className="btn" type="submit">Join the Waitlist <Arrow /></button>
              </form>
            )}
          </Reveal>
          <Reveal delay={320}>
            <div className="cta-fine">Trusted by professionals from product, engineering, design, sales and consulting.</div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────
function FooterSection() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="logo">Pre<span className="pp">pp</span>flow</div>
            <p className="tag">Always ready. Never caught off guard.</p>
          </div>
          <div className="footer-cols">
            <div>
              <h5>Product</h5>
              <ul>
                <li><a href="#features">Features</a></li>
                <li><a href="#how">How it works</a></li>
                <li><a href="#pricing">Pricing</a></li>
                <li><a href="#waitlist">Waitlist</a></li>
              </ul>
            </div>
            <div>
              <h5>Company</h5>
              <ul>
                <li><a href="#">About</a></li>
                <li><a href="#">Careers</a></li>
                <li><a href="#">Press</a></li>
                <li><a href="#">Contact</a></li>
              </ul>
            </div>
            <div>
              <h5>Resources</h5>
              <ul>
                <li><a href="#">Blog</a></li>
                <li><a href="#">Interview guides</a></li>
                <li><a href="#">Salary reports</a></li>
                <li><a href="#">Help center</a></li>
              </ul>
            </div>
          </div>
          <div className="socials">
            <a href="#" aria-label="Twitter"><Twitter /></a>
            <a href="#" aria-label="LinkedIn"><LinkedIn /></a>
            <a href="#" aria-label="GitHub"><Github /></a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Preppflow 2025. All rights reserved.</span>
          <span><a href="#">Privacy</a> · <a href="#">Terms</a> · <a href="#">Security</a></span>
        </div>
      </div>
    </footer>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function PreppflowPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const formRef = useRef(null)

  const onJoinClick = () => {
    if (formRef.current) {
      window.scrollTo({ top: formRef.current.offsetTop - 40, behavior: 'smooth' })
      setTimeout(() => {
        const inp = formRef.current && formRef.current.querySelector('input')
        if (inp) inp.focus()
      }, 600)
    }
  }

  const scrollTo = (id) => {
    const el = document.getElementById(id)
    if (el) window.scrollTo({ top: el.offsetTop - 60, behavior: 'smooth' })
  }

  const onSubmit = () => {
    if (!email) return
    setSubmitted(true)
  }

  return (
    <div className="pf">
      <Nav onJoinClick={onJoinClick} />
      <Hero onJoinClick={onJoinClick} scrollTo={scrollTo} />
      <ProblemSection />
      <HowItWorksSection />
      <FeaturesSection />
      <HabitSection />
      <SocialProofSection />
      <PricingSection onJoinClick={onJoinClick} />
      <WaitlistSection
        formRef={formRef}
        email={email}
        setEmail={setEmail}
        submitted={submitted}
        onSubmit={onSubmit}
      />
      <FooterSection />
    </div>
  )
}
