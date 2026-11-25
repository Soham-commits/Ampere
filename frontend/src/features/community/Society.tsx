import { Bookmark, ChevronDown, MessageCircle, Plus, ThumbsUp, Zap } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { uuid } from '../../lib/ids'
import { useDataVersion, useSession } from '../../app/hooks'
import { Page, PageHeader } from '../../components/Shell'
import { Button, Card, Sheet } from '../../components/ui'
import { CIRCLE_CHARGING, LEARNINGS, SOCIETIES, type Learning, type LearningCategory } from './fixtures'
import { listAmpereStations, useSavedStations } from '../stations/saved'
import { useDemoState } from '../shared/useDemoState'

export default function Society() {
  const user = useSession()!
  const [society, setSociety] = useDemoState(user.id, 'society', SOCIETIES[0])
  const [joined, setJoined] = useDemoState<string[]>(user.id, 'joined-societies', [])
  const [posts, setPosts] = useDemoState<Learning[]>(user.id, 'learnings', [])
  const [liked, setLiked] = useDemoState<string[]>(user.id, 'helpful', [])
  const [filter, setFilter] = useState('All')
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [category, setCategory] = useState<LearningCategory>('Charging')
  useDataVersion()
  const saved = useSavedStations(user.id)
  const circle = CIRCLE_CHARGING[society] ?? CIRCLE_CHARGING[SOCIETIES[0]]
  const chargers = listAmpereStations().filter((station) => circle.stationIds.includes(station.id))
  const isJoined = joined.includes(society)
  const feed = [...posts, ...LEARNINGS].filter((post) => post.society === society && (filter === 'All' || post.category === filter))
  function share() {
    if (!title.trim() || !body.trim() || !isJoined) return
    setPosts([{ id: uuid(), author: user.display_name, category, title: title.trim(), body: body.trim(), society }, ...posts])
    setTitle('')
    setBody('')
    setOpen(false)
  }
  return (
    <>
      <PageHeader back title="Society hub" />
      <Page className="mx-auto max-w-2xl">
        <Card className="border border-line !rounded-[2rem] !p-4">
          <label className="block text-xs font-medium text-muted">
            Charging circle
            <select
              value={society}
              onChange={(e) => setSociety(e.target.value)}
              className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-2 px-3 text-sm text-ink"
            >
              {SOCIETIES.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
        </Card>
        <section aria-labelledby="circle-chargers" className="mt-5">
          <h2 id="circle-chargers" className="mb-2 text-lg font-semibold">Chargers in {circle.area}</h2>
          {chargers.length ? (
            <ul className="space-y-2">
              {chargers.map((charger) => (
                <li key={charger.id} className="flex min-w-0 items-center gap-2 rounded-2xl border border-line p-3">
                  <Link to={`/station/${charger.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-xl">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-volt-soft text-volt"><Zap className="size-4" aria-hidden="true" /></span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{charger.name}</span>
                      <span className="block text-xs text-muted">{charger.connectors}</span>
                      <span className="mt-1 block text-xs font-semibold text-volt">View booking options</span>
                    </span>
                  </Link>
                  <button type="button" aria-label={`Save ${charger.name}`} aria-pressed={saved.isSaved(charger.id)} onClick={() => saved.toggle(charger.id)}
                    className="grid size-11 shrink-0 place-items-center rounded-full bg-surface-2 text-volt">
                    <Bookmark className={`size-4 ${saved.isSaved(charger.id) ? 'fill-current' : ''}`} aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <Card className="border border-line !p-4">
              <p className="mb-2 text-sm text-muted">No circle chargers listed yet.</p>
              <Link to="/discover" className="inline-flex min-h-11 items-center text-sm font-semibold text-volt">Find reachable chargers</Link>
            </Card>
          )}
        </section>
        <details className="group mt-5 rounded-2xl border border-line px-4">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Circle learnings <ChevronDown className="size-4 text-muted group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="text-xs text-muted">Sample posts. Your notes stay on this device.</p>
        <div className="mb-3 mt-3 flex items-center justify-between gap-3">
          <Button size="sm" variant="secondary" onClick={() => setJoined(isJoined ? joined.filter((name) => name !== society) : [...joined, society])}>
            {isJoined ? 'Leave circle' : 'Join circle'}
          </Button>
          <Button size="sm" disabled={!isJoined} onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Add note
          </Button>
        </div>
        <div className="mb-5 flex flex-wrap gap-2" aria-label="Learning topics">
          {['All', 'Charging', 'Etiquette', 'Solar'].map((topic) => (
            <button
              key={topic}
              aria-pressed={filter === topic}
              onClick={() => setFilter(topic)}
              className={`min-h-10 rounded-full px-4 text-xs font-medium ${filter === topic ? 'bg-volt text-white' : 'bg-surface-2 text-ink-2'}`}
            >
              {topic}
            </button>
          ))}
        </div>
        <div className="space-y-3 pb-3">
          {feed.map((post) => (
            <Card as="article" key={post.id} className="border border-line !rounded-[1.75rem] !p-5">
              <p className="text-[11px] font-medium text-volt">{post.category}</p>
              <h3 className="mt-3 text-xl font-medium leading-tight">{post.title}</h3>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-2">{post.body}</p>
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
                <p className="text-xs text-muted">{post.author}</p>
                <button
                  aria-pressed={liked.includes(post.id)}
                  onClick={() => setLiked(liked.includes(post.id) ? liked.filter((id) => id !== post.id) : [...liked, post.id])}
                  className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-xs text-volt"
                >
                  <ThumbsUp className="size-3.5" />
                  {liked.includes(post.id) ? 'Helpful to you' : 'Helpful'}
                </button>
              </div>
            </Card>
          ))}
          {!feed.length ? (
            <Card className="py-10 text-center text-sm text-muted">
              <MessageCircle className="mx-auto mb-3 size-7" />
              No learnings in this topic yet. Share the first one.
            </Card>
          ) : null}
        </div>
        </details>
        <Sheet open={open} onClose={() => setOpen(false)} title="Add a circle note">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              share()
            }}
            className="space-y-4"
          >
            <label className="block text-sm">
              Topic
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as LearningCategory)}
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-2 px-3"
              >
                {['Charging', 'Etiquette', 'Solar'].map((topic) => (
                  <option key={topic}>{topic}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Title
              <input
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-line bg-surface-2 px-3"
                placeholder="What worked for you?"
              />
            </label>
            <label className="block text-sm">
              Your learning
              <textarea
                required
                maxLength={1000}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                className="mt-2 w-full resize-y rounded-2xl border border-line bg-surface-2 p-3"
                placeholder="Share something useful for another driver…"
              />
            </label>
            <Button type="submit" disabled={!isJoined || !title.trim() || !body.trim()} className="w-full">
              Save learning
            </Button>
          </form>
        </Sheet>
      </Page>
    </>
  )
}
