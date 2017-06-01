const addBicluster = (count, bicluster) => {
  for (const [u, v] of bicluster.edges) {
    const key = `${u}:${v}`
    if (!count.has(key)) {
      count.set(key, 0)
    }
    count.set(key, count.get(key) + 1)
  }
}

const removeBicluster = (count, bicluster) => {
  for (const [u, v] of bicluster.edges) {
    const key = `${u}:${v}`
    count.set(key, count.get(key) - 1)
  }
}

const f = (count) => {
  let score = 0
  for (const n of count.values()) {
    for (let i = 1; i <= n; ++i) {
      score += 1 / i
    }
  }
  return score
}

export const greedyOrder = (biclusters) => {
  const count = new Map()
  const n = biclusters.length
  const used = biclusters.map(() => false)
  const order = new Map()
  for (let i = 0; i < n; ++i) {
    let best = 0
    let selected = null
    for (let j = 0; j < n; ++j) {
      if (used[j]) {
        continue
      }
      const bicluster = biclusters[j]
      addBicluster(count, bicluster)
      const score = f(count)
      if (score > best) {
        best = score
        selected = j
      }
      removeBicluster(count, bicluster)
    }
    console.log(best)
    addBicluster(count, biclusters[selected])
    used[selected] = true
    order.set(biclusters[selected].id, i)
  }
  biclusters.sort((b1, b2) => order.get(b1.id) - order.get(b2.id))
}
