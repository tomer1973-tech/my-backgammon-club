'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { GLOSSARY } from '@/lib/rules-content'

export function RulesTabs() {
  const [tab, setTab] = useState('play')

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList>
        <TabsTrigger value="play">How to Play</TabsTrigger>
        <TabsTrigger value="cube">Doubling Cube & Scoring</TabsTrigger>
        <TabsTrigger value="glossary">Glossary</TabsTrigger>
      </TabsList>

      <TabsContent value="play">
        <HowToPlay />
      </TabsContent>

      <TabsContent value="cube">
        <DoublingCube />
      </TabsContent>

      <TabsContent value="glossary">
        <Glossary />
      </TabsContent>
    </Tabs>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface-raised p-5 space-y-2">
      <h3 className="text-sm font-semibold text-gold">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-ink-muted">{children}</div>
    </div>
  )
}

function HowToPlay() {
  return (
    <div className="mt-4 space-y-4">
      <Section title="Object of the game">
        <p>
          Backgammon is a race. Each player has 15 checkers that travel around the board in
          opposite directions, through their own home board, and off the board ("bear off").
          The first player to bear off all 15 checkers wins.
        </p>
      </Section>

      <Section title="Setup & movement">
        <p>
          The board has 24 triangular points, grouped into four quadrants of six. Each player's
          checkers move in one direction — toward that player's home board (the six points in
          their own corner) — and then off the board.
        </p>
        <p>
          On your turn, roll two dice and move two checkers (or one checker twice) by the number
          of pips shown — for example, a roll of 5-3 lets you move one checker 5 points and
          another (or the same) checker 3 points. If you roll doubles, you play that number
          four times.
        </p>
      </Section>

      <Section title="Landing on points">
        <p>
          You may move a checker to any point that is empty, occupied by your own checkers, or
          occupied by exactly one opposing checker. You may not move to a point held by two or
          more opposing checkers.
        </p>
        <p>
          If you land on a point with a single opposing checker (a "blot"), you hit it — that
          checker is placed on the bar in the middle of the board.
        </p>
      </Section>

      <Section title="Entering from the bar">
        <p>
          A player with a checker on the bar must re-enter it into the opponent's home board
          before making any other move. The checker enters on the point corresponding to the
          die roll. If both entry points are blocked (occupied by two or more opposing
          checkers), that player forfeits their entire turn.
        </p>
      </Section>

      <Section title="Bearing off">
        <p>
          Once all 15 of a player's checkers are in their home board, they may begin bearing
          off — removing checkers from the board. A roll matching a point's number removes a
          checker from that point. If there's no checker on the exact point, the roll may be
          used to bear off a checker from a lower point, but only if no checkers remain on
          higher points.
        </p>
        <p>
          If a checker is hit during bear-off, it must re-enter and travel all the way around
          the board again before that player can resume bearing off — so staying safe matters
          right to the end.
        </p>
      </Section>

      <Section title="Winning, gammons & backgammons">
        <p>
          A normal win is worth 1 point (times the doubling cube). If the loser hasn't borne off
          a single checker, it's a "gammon" worth 2 points. If the loser hasn't borne off a
          checker and still has a checker on the bar or in the winner's home board, it's a
          "backgammon" worth 3 points.
        </p>
      </Section>
    </div>
  )
}

function DoublingCube() {
  return (
    <div className="mt-4 space-y-4">
      <Section title="What is the doubling cube?">
        <p>
          The doubling cube is a six-sided die marked 2, 4, 8, 16, 32, and 64. It's used to raise
          the stakes of a game — it doesn't affect how the game is played, only how many points
          it's worth.
        </p>
      </Section>

      <Section title="Offering & responding to a double">
        <p>
          At the start of your turn, before rolling, you may offer the cube to your opponent —
          proposing to double the value of the game (starting at 1, so the first double makes it
          worth 2).
        </p>
        <p>
          Your opponent must either <span className="font-semibold text-ink">accept</span> (the
          game continues at the new value, and they now own the cube — only they can double
          again), or <span className="font-semibold text-ink">decline</span> (the game ends
          immediately and they forfeit points equal to the current cube value).
        </p>
      </Section>

      <Section title="Scoring summary">
        <ul className="list-disc space-y-1 pl-5">
          <li>Normal win: 1 × cube value</li>
          <li>Gammon (loser bore off zero checkers): 2 × cube value</li>
          <li>Backgammon (loser bore off zero, and has a checker on the bar or in the winner's home): 3 × cube value</li>
          <li>Declined double: cube value at the time of the double</li>
        </ul>
      </Section>
    </div>
  )
}

function Glossary() {
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {GLOSSARY.map(g => (
        <div key={g.term} className="rounded-xl border border-line bg-surface-raised p-4">
          <p className="text-sm font-semibold text-ink">{g.term}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{g.definition}</p>
        </div>
      ))}
    </div>
  )
}
