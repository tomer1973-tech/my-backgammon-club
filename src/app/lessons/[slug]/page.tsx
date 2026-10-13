import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LESSONS, getLesson } from '@/lib/lessons-content'
import { LessonClient } from '@/components/lessons/lesson-client'

export function generateStaticParams() {
  return LESSONS.map(l => ({ slug: l.slug }))
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;
  const lesson = getLesson(params.slug)
  return { title: lesson ? `${lesson.title} — My Backgammon Club` : 'Lesson — My Backgammon Club' }
}

export default async function LessonPage(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const lesson = getLesson(params.slug)
  if (!lesson) notFound()

  const index = LESSONS.findIndex(l => l.slug === lesson.slug)
  const next = LESSONS[index + 1]

  return (
    <LessonClient
      lesson={lesson}
      nextLesson={next ? { slug: next.slug, title: next.title } : undefined}
    />
  )
}
