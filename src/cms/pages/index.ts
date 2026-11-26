/** Panelden düzenlenebilen tüm sayfalar (Sayfalar menüsündeki sırayla) */
import type { PageDef } from './types'
import { homePage } from './home'
import { gamesPage } from './oyunlar'
import { interactionsPage } from './etkilesimler'
import { toolsPage } from './manipulatifler'
import { guidesPage } from './rehber'
import { testsPage } from './test'
import { timesPage } from './carpimTablosu'
import { approachPage } from './yaklasim'
import { lessonPage } from './onlineOzelDers'

export const pageDefs: PageDef[] = [homePage, gamesPage, interactionsPage, toolsPage, guidesPage, testsPage, timesPage, approachPage, lessonPage] as unknown as PageDef[]

export const pageDefById = Object.fromEntries(pageDefs.map((d) => [d.id, d])) as Record<string, PageDef>
