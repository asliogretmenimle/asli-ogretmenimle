import { useMemo, useRef, useState } from 'react'
import type { InteractionProps } from '../types'
import { Scene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { lcm } from '../../lib/numberTheory'
import { Card, Header, NextButton, pick } from '../donusum-studyosu/ortak'
import { Sonuc } from '../ebob-simulasyonu/sonuc'
import type { Row } from '../ebob-simulasyonu/sim'
import { Bilye, Disli, Fayans, Otobus } from './senaryolar'

/**
 * 83. EKOK Problem Simülasyonu (8. sınıf, Çarpanlar ve Katlar)
 * EKOK adı ve yöntemi başta verilmez. Her problemde öğrenci önce tahmin eder, sonra simülasyonda dener
 * (iki koşulu birden sağlamayan anlar görünür), ortak katları listeler ve en küçüğünü seçer;
 * ardından bir sayma/devam sorusunu çözer. Sonuç kartında EKOK adı türetilir ve EBOB ile karşılaştırılır.
 *  a. otobüsler → ilk birlikte kalkış     b. dişliler → işaretlerin yeniden karşılaşması
 *  c. fayans → en küçük kare               d. kalanlı gruplama → EKOK + kalan
 */

type Task =
  | { kind: 'otobus'; a: number; b: number }
  | { kind: 'disli'; a: number; b: number }
  | { kind: 'fayans'; a: number; b: number }
  | { kind: 'bilye'; a: number; b: number; r: number }
  | { kind: 'sonuc' }

const POOLS = {
  otobus: [[12, 18], [10, 15], [8, 12], [15, 20], [9, 12]],
  disli: [[12, 20], [8, 12], [10, 15], [12, 18], [9, 15]],
  fayans: [[6, 8], [4, 6], [6, 9], [8, 12], [4, 10]],
  bilye: [[4, 6, 1], [3, 5, 2], [6, 8, 1], [4, 10, 3], [6, 9, 2]],
} as const

function makeTasks(): Task[] {
  const [oa, ob] = pick(POOLS.otobus)
  const [da, db] = pick(POOLS.disli)
  const [fa, fb] = pick(POOLS.fayans)
  const [ba, bb, br] = pick(POOLS.bilye)
  return [
    { kind: 'otobus', a: oa, b: ob },
    { kind: 'disli', a: da, b: db },
    { kind: 'fayans', a: fa, b: fb },
    { kind: 'bilye', a: ba, b: bb, r: br },
    { kind: 'sonuc' },
  ]
}

const titles: Record<Task['kind'], string> = {
  otobus: 'Otobüsler ne zaman yine birlikte?',
  disli: 'Dişliler başa dönüyor',
  fayans: 'Fayanslarla en küçük kare',
  bilye: 'Hep 1 fazla kalan bilyeler',
  sonuc: 'Dört problemin ortak sırrı',
}
const emojis: Record<Task['kind'], string> = { otobus: '🚌', disli: '⚙️', fayans: '🧱', bilye: '🔮', sonuc: '🔎' }

/** n’nin katları (en fazla max’a kadar, en çok 12 tane) */
const multiples = (n: number, max: number) => Array.from({ length: Math.min(12, Math.floor(max / n)) }, (_, i) => (i + 1) * n)

export default function EkokSimulasyonu({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(makeTasks, [])
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const firsts = useRef<boolean[]>([])
  const task = tasks[idx]
  const last = idx === tasks.length - 1
  const titled = { ...titles, bilye: task.kind === 'bilye' ? `Hep ${task.r} fazla kalan bilyeler` : titles.bilye }

  const solve = (first: boolean, row?: Row) => {
    if (firsts.current.length <= idx) firsts.current.push(first)
    if (row) setRows((r) => [...r, row])
    setSolved(true)
  }
  const next = () => {
    if (!last) {
      setIdx(idx + 1)
      setSolved(false)
      return
    }
    const f = firsts.current.filter(Boolean).length
    onFinish({
      stars: starsFor(f / tasks.length),
      summary: `Dört EKOK problemini simülasyonla çözdün; ${tasks.length} görevin ${f} tanesinde ilk denemede doğru cevaba ulaştın.`,
      insight: 'Tekrar eden olayların ilk kez yeniden birlikte gerçekleştiği an ve küçük parçalardan kurulabilecek en küçük ortak bütün, iki sayının da katı olan en küçük sayıdır: ortak katların en küçüğü, yani EKOK. Bütün ortak katlar EKOK’un katlarıdır.',
    })
  }

  const footer = solved ? <NextButton last={last} onClick={next} /> : null
  const sp = { footer, onSolved: (row: Row, first: boolean) => solve(first, row) }
  return (
    <Scene grade={grade}>
      <Header emoji={emojis[task.kind]} kicker="Problem" title={titled[task.kind]} idx={idx} total={tasks.length} dark />
      <div key={idx}>
        {task.kind === 'otobus' && <Otobus a={task.a} b={task.b} {...sp} />}
        {task.kind === 'disli' && <Disli n1={task.a} n2={task.b} {...sp} />}
        {task.kind === 'fayans' && <Fayans w={task.a} h={task.b} {...sp} />}
        {task.kind === 'bilye' && <Bilye a={task.a} b={task.b} r={task.r} {...sp} />}
        {task.kind === 'sonuc' && (
          <Sonuc
            rows={rows}
            solved={solved}
            footer={footer}
            onSolved={(first) => solve(first)}
            lists={(r) => {
              const L = lcm(r.a, r.b)
              const ma = multiples(r.a, 2 * L), mb = multiples(r.b, 2 * L)
              return { a: ma, b: mb, common: ma.filter((x) => x % L === 0), more: true }
            }}
            reveal={
              <>
                <p>Dört problemde de aradığın sayı <b>iki sayının da katıydı</b> (ortak kat) ve bunların <b>en küçüğüydü</b>.</p>
                <p className="mt-2 rounded-xl bg-amber-100 px-3 py-2 text-amber-950">Ortak katların en küçüğüne <b>En Küçük Ortak Kat (EKOK)</b> denir.{rows[0] && <> Örneğin EKOK({rows[0].a}, {rows[0].b}) = {lcm(rows[0].a, rows[0].b)}.</>}</p>
                <p className="mt-2 text-base">Bütün ortak katlar (yeşiller) EKOK’un katlarıdır; bu yüzden birlikte kalkışlar da EKOK kadar dakikada bir tekrar eder.</p>
              </>
            }
            clues={['ilk kez yeniden', 'birlikte', 'en az', 'en küçük kare', 'aynı anda', 'hep aynı kalan']}
            compare={
              <Card dark>
                <p className="mb-2 text-[11px] font-black tracking-wide text-pink-300 uppercase">EBOB mu, EKOK mu?</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-emerald-900/50 p-3 ring-1 ring-emerald-700">
                    <p className="font-black text-emerald-200">EBOB ✂️</p>
                    <p className="mt-1 text-sm font-bold text-slate-200">Bir bütünü artmadan <b>eş parçalara böleriz</b>. Cevap iki sayıyı da böler; küçük sayıdan büyük olamaz.</p>
                  </div>
                  <div className="rounded-xl bg-sky-900/50 p-3 ring-1 ring-sky-700">
                    <p className="font-black text-sky-200">EKOK 🔁</p>
                    <p className="mt-1 text-sm font-bold text-slate-200">Tekrarlar <b>yeniden buluşur</b> ya da parçalardan bütün <b>kurarız</b>. Cevap iki sayının da katıdır; büyük sayıdan küçük olamaz.</p>
                  </div>
                </div>
              </Card>
            }
            questions={[
              { prompt: 'İki zil 8 ve 12 dakikada bir çalıyor. Birlikte çaldıktan sonra ilk kez ne zaman yine birlikte çalar?', answer: 'ekok', options: [{ id: 'ebob', label: 'EBOB', why: 'Zillerin sesi parçalara ayrılmıyor; iki tekrar yeniden buluşuyor. Aranan an 8’in ve 12’nin katı olmalı.' }, { id: 'ekok', label: 'EKOK' }] },
              { prompt: '40 cm ve 56 cm’lik iki tahta, artmadan eş ve en uzun parçalara kesilecek.', answer: 'ebob', options: [{ id: 'ebob', label: 'EBOB' }, { id: 'ekok', label: 'EKOK', why: 'Tahtalar kesilip parçalara ayrılıyor; parça uzunluğu 40’ı ve 56’yı bölmeli, onlardan büyük olamaz.' }] },
              { prompt: '6 cm ve 10 cm’lik çubuklar ayrı ayrı uç uca dizilerek eşit uzunlukta en kısa iki sıra yapılacak.', answer: 'ekok', options: [{ id: 'ebob', label: 'EBOB', why: 'Çubuklar bölünmüyor, uç uca eklenerek büyüyor. Sıra uzunluğu 6’nın ve 10’un katı olmalı.' }, { id: 'ekok', label: 'EKOK' }] },
              { prompt: '36 kız ve 48 erkek öğrenci, her grupta eşit sayıda kız ve eşit sayıda erkek olacak şekilde en çok kaç gruba ayrılır?', answer: 'ebob', options: [{ id: 'ebob', label: 'EBOB' }, { id: 'ekok', label: 'EKOK', why: 'Öğrenciler gruplara bölünüyor; grup sayısı 36’yı ve 48’i bölmeli.' }] },
            ]}
          />
        )}
      </div>
    </Scene>
  )
}
