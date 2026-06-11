import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { STRATEGY_ARTICLES } from '@/lib/rules-content'
import { cn } from '@/lib/utils'

const LEVEL_STYLES: Record<string, string> = {
  Beginner:     'bg-win/10 text-win border-win/30',
  Intermediate: 'bg-gold/10 text-gold border-gold/30',
  Advanced:     'bg-loss/10 text-loss border-loss/30',
}

export function generateStaticParams() {
  return STRATEGY_ARTICLES.map(a => ({ slug: a.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const article = STRATEGY_ARTICLES.find(a => a.slug === params.slug)
  return { title: article ? `${article.title} — My Backgammon Club` : 'Strategy — My Backgammon Club' }
}

export default function StrategyArticlePage({ params }: { params: { slug: string } }) {
  const article = STRATEGY_ARTICLES.find(a => a.slug === params.slug)
  if (!article) notFound()

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div>
        <Link
          href="/rules/strategy"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Strategy Articles
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <h1 className="text-2xl font-bold text-ink">{article.title}</h1>
          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium', LEVEL_STYLES[article.level])}>
            {article.level}
          </span>
        </div>
        <p className="mt-0.5 text-sm text-ink-muted">{article.summary}</p>
      </div>

      <div className="space-y-4">
        {article.sections.map(section => (
          <div key={section.heading} className="rounded-2xl border border-line bg-surface-raised p-5 space-y-2">
            <h2 className="text-sm font-semibold text-gold">{section.heading}</h2>
            <div className="space-y-2 text-sm leading-relaxed text-ink-muted">
              {section.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
