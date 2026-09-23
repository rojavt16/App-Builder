/*
* <license header>
*/

import allActions from '../config.json'

export function actionUrl (name) {
  if (allActions[name]) {
    return allActions[name]
  }

  const qualified = Object.keys(allActions).find((key) => key.endsWith(`/${name}`))
  if (qualified) {
    return allActions[qualified]
  }

  throw new Error(
    `action '${name}' is not in config.json (found: ${Object.keys(allActions).join(', ') || 'nothing'}). ` +
    'Rebuild the app so the action list is regenerated.'
  )
}
