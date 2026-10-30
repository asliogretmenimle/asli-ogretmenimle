import { useMemo, useRef, useState } from 'react'
import type { InteractionProps } from '../types'
import { Scene } from '../../games/kit2'
import { starsFor } from '../../games/kit'
import { commonDivisors, divisors, gcd } from '../../lib/numberTheory'
import { Header, NextButton, pick } from '../donusum-studyosu/ortak'
import { Agac, Kurdele, Paket, Tarla } from './senaryolar'
import { Sonuc } from './sonuc'
import type { Row } from './sim'

/**
 * 82. EBOB Problem Simülasyonu (8. sınıf, Çarpanlar ve Katlar)
 * EBOB adı ve yöntemi başta verilmez. Her problemde öğrenci önce tahmin eder, sonra simülasyonda
 * parça büyüklüğünü dener (artan parça kırmızı görünür), tam oturanlar listelenir ve en büyüğünü seçer;
 * ardından parça sayısını hesaplar. Sonuç kartında dört problemin ortak yapısından EBOB adı türetilir.
 *  a. tarla → eş ve en büyük kare parseller      b. kurdele → artıksız en uzun parçalar
 *  c. paketleme → en çok eş paket                  d. ağaç dikme → köşelere de gelen en büyük aralık
 */

type Task =
  | { kind: 'tarla'; a: number; b: number }
  | { kind: 'kurdele'; a: number; b: number }
  | { kind: 'paket'; a: number; b: number }
  | { kind: 'agac'; a: number; b: number }
  | { kind: 'sonuc' }

const POOLS = {
  tarla: [[24, 36], [18, 30], [20, 32], [28, 42], [16, 40]],
  kurdele: [[60, 84], [48, 72], [45, 75], [36, 90], [42, 70]],
  paket: [[48, 60], [36, 54], [42, 56], [40, 64], [45, 75]],
  agac: [[30, 42], [24, 36], [40, 56], [27, 45], [35, 49]],
} as const

function makeTasks(): Task[] {
  const [ta, tb] = pick(POOLS.tarla)
  const [ka, kb] = pick(POOLS.kurdele)
  const [pa, pb] = pick(POOLS.paket)
  const [aa, ab] = pick(POOLS.agac)
  return [
    { kind: 'tarla', a: ta, b: tb },
    { kind: 'kurdele', a: ka, b: kb },
    { kind: 'paket', a: pa, b: pb },
    { kind: 'agac', a: aa, b: ab },
    { kind: 'sonuc' },
  ]
}

const titles: Record<Task['kind'], string> = {
  tarla: 'Tarlayı kare parsellere böl',
  kurdele: 'Kurdeleleri artıksız kes',
  paket: 'Meyveleri eş paketle',
  agac: 'Bahçeye ağaç dik',
  sonuc: 'Dört problemin ortak sırrı',
}
const emojis: Record<Task['kind'], string> = { tarla: '🌾', kurdele: '🎀', paket: '📦', agac: '🌳', sonuc: '🔎' }

export default function EbobSimulasyonu({ grade, onFinish }: InteractionProps) {
  const tasks = useMemo(makeTasks, [])
  const [idx, setIdx] = useState(0)
  const [solved, setSolved] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const firsts = useRef<boolean[]>([])
  const task = tasks[idx]
  const last = idx === tasks.length - 1

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
      summary: `Dört EBOB problemini simülasyonla çözdün; ${tasks.length} görevin ${f} tanesinde ilk denemede doğru cevaba ulaştın.`,
      insight: 'Bir bütünü artık kalmadan eş ve olabildiğince büyük parçalara ayırırken parça büyüklüğü iki niceliği de bölmeli ve en büyük olmalıdır: ortak bölenlerin en büyüğü, yani EBOB. Parça sayısı her niceliğin EBOB’a bölümünden bulunur.',
    })
  }

  const footer = solved ? <NextButton last={last} onClick={next} /> : null
  const sp = { footer, onSolved: (row: Row, first: boolean) => solve(first, row) }
  return (
    <Scene grade={grade}>
      <Header emoji={emojis[task.kind]} kicker="Problem" title={titles[task.kind]} idx={idx} total={tasks.length} dark />
      <div key={idx}>
        {task.kind === 'tarla' && <Tarla W={Math.max(task.a, task.b)} H={Math.min(task.a, task.b)} {...sp} />}
        {task.kind === 'kurdele' && <Kurdele A={task.a} B={task.b} {...sp} />}
        {task.kind === 'paket' && <Paket A={task.a} B={task.b} {...sp} />}
        {task.kind === 'agac' && <Agac W={Math.max(task.a, task.b)} H={Math.min(task.a, task.b)} {...sp} />}
        {task.kind === 'sonuc' && (
          <Sonuc
            rows={rows}
            solved={solved}
            footer={footer}
            onSolved={(first) => solve(first)}
            lists={(r) => ({ a: divisors(r.a), b: divisors(r.b), common: commonDivisors(r.a, r.b) })}
            reveal={
              <>
                <p>Dört problemde de aradığın sayı <b>iki niceliği de bölüyordu</b> (ortak bölen) ve bunların <b>en büyüğüydü</b>.</p>
                <p className="mt-2 rounded-xl bg-amber-100 px-3 py-2 text-amber-950">Ortak bölenlerin en büyüğüne <b>En Büyük Ortak Bölen (EBOB)</b> denir.{rows[0] && <> Örneğin EBOB({rows[0].a}, {rows[0].b}) = {gcd(rows[0].a, rows[0].b)}.</>}</p>
                <p className="mt-2 text-base">Bütün ortak bölenler (yeşiller) EBOB’un da bölenidir.</p>
              </>
            }
            clues={['en büyük', 'eş parçalara', 'artmadan', 'hiç artık kalmadan', 'en çok kaç paket / grup', 'köşelere de gelecek şekilde en az']}
            questions={[
              {
                prompt: 'Hangisi bir EBOB problemidir?',
                answer: 'karton',
                options: [
                  { id: 'zil', label: 'İki zil 6 ve 8 dakikada bir çalıyor. Birlikte çaldıktan sonra ilk kez ne zaman yine birlikte çalar?', why: 'Burada iki olay yeniden buluşuyor; aranan sayı 6’yı ve 8’i bölmüyor, ikisinin de katı. Parçalara ayırma var mı?' },
                  { id: 'karton', label: '18 cm × 24 cm’lik bir karton, artmadan eş ve en büyük karelere kesilecek. Karenin kenarı kaç cm olur?' },
                  { id: 'yas', label: 'Ali 18, kardeşi 24 yaşında. İkisinin yaşları toplamı kaçtır?', why: 'Bu bir toplama problemi; ortak bir parça büyüklüğü aranmıyor.' },
                ],
              },
            ]}
          />
        )}
      </div>
    </Scene>
  )
}
