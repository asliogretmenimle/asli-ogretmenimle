import { renderToString } from 'react-dom/server'
import FrogJump from './src/games/FrogJump'
import SecretNumber from './src/games/SecretNumber'
import NumberLineGuess from './src/games/NumberLineGuess'
import RuleMachine from './src/games/RuleMachine'
const games: [string, any, number[]][] = [
  ['frog', FrogJump, [1, 2, 3, 4]],
  ['secret', SecretNumber, [1, 2, 3, 4, 6, 7]],
  ['tahmin', NumberLineGuess, [1, 2, 3, 4, 5, 6, 7, 8]],
  ['makine', RuleMachine, [3, 4, 5, 6, 7, 8]],
]
for (const [name, G, grades] of games) for (const g of grades) {
  const t = Date.now()
  for (let i = 0; i < 30; i++) renderToString(<G grade={g} onFinish={() => {}} />)
  console.log(name, g, 'ok', (Date.now() - t) / 30, 'ms')
}
