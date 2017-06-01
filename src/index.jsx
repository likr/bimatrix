import React from 'react'
import {render} from 'react-dom'
import * as d3 from 'd3'
import Graph from 'egraph/graph'
import qbMining from 'egraph/transformer/edge-concentration/quasi-biclique-mining'
import {greedyOrder} from './greedy-order'

const findBiclusters = (cols, data) => {
  const graph = new Graph()
  const rows = data.map(({name}) => name)
  for (const col of cols) {
    graph.addVertex(col)
  }
  for (const item of data) {
    const row = item.name
    graph.addVertex(row)
    for (const col of cols) {
      if (+item[col]) {
        graph.addEdge(col, row)
      }
    }
  }
  const biclusters = qbMining(graph, cols, rows, 0.8)
  biclusters.forEach((bicluster, i) => {
    bicluster.id = i
    bicluster.cols = bicluster.source
    bicluster.rows = bicluster.target
    bicluster.colSet = new Set(bicluster.cols)
    bicluster.rowSet = new Set(bicluster.rows)
    bicluster.colWeight = new Map(bicluster.cols.map((col) => [col, graph.outVertices(col).filter((u) => bicluster.rowSet.has(u)).length / bicluster.rows.length]))
    bicluster.rowWeight = new Map(bicluster.rows.map((row) => [row, graph.inVertices(row).filter((v) => bicluster.colSet.has(v)).length / bicluster.cols.length]))
    const edges = []
    for (const u of bicluster.source) {
      for (const v of bicluster.target) {
        if (graph.edge(u, v)) {
          edges.push([u, v])
        }
      }
    }
    bicluster.edges = edges
  })
  return biclusters
}

const sortByKey = (array, key) => {
  const keys = new Map(array.map((v, i) => [v, key(v, i)]))
  array.sort((a, b) => keys.get(a) - keys.get(b))
}

class App extends React.Component {
  constructor (props) {
    super(props)
    const {data} = props
    const rows = data.map(({name}, index) => ({name, index}))
    const cols = Object.keys(data[0]).filter((col) => col !== 'name').map((name, index) => ({name, index}))
    const biclusters = findBiclusters(cols.map((col) => col.name), data)
    const edges = new Set()
    for (const b of biclusters) {
      for (const [col, row] of b.edges) {
        edges.add(`${row}:${col}`)
      }
    }

    greedyOrder(biclusters)
    sortByKey(rows, (row) => ((v) => v < 0 ? Infinity : v)(biclusters.findIndex((b) => b.rowSet.has(row.name))))
    sortByKey(cols, (col) => ((v) => v < 0 ? Infinity : v)(biclusters.findIndex((b) => b.colSet.has(col.name))))
    biclusters.reverse()
    biclusters.forEach((bicluster, i) => {
      bicluster.index = i
    })

    this.state = {
      biclusters,
      edges,
      rows,
      cols,
      selectedBiclusters: new Set(),
      selectedRows: new Set(),
      selectedCols: new Set(),
      filteredBiclusters: biclusters,
      filteredCols: cols,
      filteredRows: rows
    }
  }

  render () {
    const {
      edges,
      filteredBiclusters,
      filteredCols,
      filteredRows,
      selectedBiclusters,
      selectedRows,
      selectedCols
    } = this.state
    const colIndex = new Map(filteredCols.map((col, i) => [col.name, i]))
    const rowIndex = new Map(filteredRows.map((row, i) => [row.name, i]))
    const svgMargin = 20
    const scale = 1
    const cellWidth = 20
    const cellHeight = 20
    const cellMargin = 2
    const biclusterWidth = 40
    const biclusterHeight = 40
    const rowMargin = 80
    const colMargin = 80
    const fillColor = 'black'
    const selectedFillColor = 'red'
    const biclusterWidthScale = d3.scaleLinear()
      .domain(d3.extent(filteredBiclusters, ({cols}) => cols.length))
      .range([biclusterWidth / 2, biclusterWidth])
    const biclusterHeightScale = d3.scaleLinear()
      .domain(d3.extent(filteredBiclusters, ({rows}) => rows.length))
      .range([biclusterHeight / 2, biclusterHeight])
    const biclusterX = filteredBiclusters.reduce((res, b) => {
      res.push(res[res.length - 1] + biclusterWidthScale(b.cols.length) + cellMargin * 2)
      return res
    }, [0])
    const biclusterY = filteredBiclusters.reduce((res, b) => {
      res.push(res[res.length - 1] + biclusterHeightScale(b.rows.length) + cellMargin * 2)
      return res
    }, [0])
    const width = cellWidth * filteredCols.length + biclusterX[filteredBiclusters.length] + rowMargin + svgMargin * 2
    const height = cellHeight * filteredRows.length + biclusterY[filteredBiclusters.length] + colMargin + svgMargin * 2
    return <div>
      <div>
        <button onClick={this.handleClickClearButton.bind(this)}>Clear</button>
      </div>
      <div>
        <svg width={width * scale} height={height * scale}>
          <g transform={`scale(${scale})translate(${svgMargin},${svgMargin})`}>
            <g>{
              filteredBiclusters.map(({index, cols, rows, colWeight, rowWeight}, i) => {
                return <g
                  key={index}
                  onClick={this.handleClickBicluster.bind(this, index)}
                  onMouseOver={this.handleMouseOverBicluster.bind(this, index)}
                  onMouseLeave={this.handleMouseLeaveBicluster.bind(this)}>
                  <g transform={`translate(${biclusterX[i]},${biclusterY[i]})`}>
                    <rect
                      x={cellMargin}
                      y={cellMargin}
                      width={biclusterX[filteredBiclusters.length] - biclusterX[i] + rowMargin + cellWidth * filteredCols.length}
                      height={biclusterY[i + 1] - biclusterY[i] - cellMargin * 2}
                      fill='lightgray' />
                    <rect
                      x={cellMargin}
                      y={cellMargin}
                      width={biclusterX[i + 1] - biclusterX[i] - cellMargin * 2}
                      height={biclusterY[filteredBiclusters.length] - biclusterY[i] + colMargin + cellHeight * filteredRows.length}
                      fill='lightgray' />
                    <rect
                      x={cellMargin}
                      y={cellMargin}
                      width={biclusterX[i + 1] - biclusterX[i] - cellMargin * 2}
                      height={biclusterY[i + 1] - biclusterY[i] - cellMargin * 2}
                      fill={selectedBiclusters.has(index) ? selectedFillColor : fillColor} />
                  </g>
                  <g transform={`translate(${biclusterX[filteredBiclusters.length] + rowMargin},${biclusterY[i]})`}>{
                    cols.map((col) => {
                      return <rect
                        key={col}
                        transform={`translate(${colIndex.get(col) * cellWidth},0)`}
                        x={cellMargin}
                        y={cellMargin}
                        width={cellWidth - cellMargin * 2}
                        height={biclusterY[i + 1] - biclusterY[i] - cellMargin * 2}
                        fill={selectedBiclusters.has(index) && selectedCols.has(col) ? selectedFillColor : fillColor}
                        opacity={colWeight.get(col)} />
                    })
                  }</g>
                  <g transform={`translate(${biclusterX[i]},${biclusterY[filteredBiclusters.length] + colMargin})`}>{
                    rows.map((row) => {
                      return <rect
                        key={row}
                        transform={`translate(0,${rowIndex.get(row) * cellHeight})`}
                        x={cellMargin}
                        y={cellMargin}
                        width={biclusterX[i + 1] - biclusterX[i] - cellMargin * 2}
                        height={cellHeight - cellMargin * 2}
                        fill={selectedBiclusters.has(index) && selectedRows.has(row) ? selectedFillColor : fillColor}
                        opacity={rowWeight.get(row)} />
                    })
                  }</g>
                </g>
              })
            }</g>
            <g transform={`translate(${biclusterX[filteredBiclusters.length] + rowMargin},${biclusterY[filteredBiclusters.length] + colMargin})`}>
              {
                filteredCols.map((col, i) => {
                  return <g key={i} transform={`translate(${i * cellWidth},-10)rotate(-90)`}>
                    <text
                      y='14'
                      fill={selectedCols.has(col.name) ? selectedFillColor : fillColor}
                      onMouseOver={this.handleMouseOverColumn.bind(this, col)}
                      onMouseLeave={this.handleMouseLeaveColumn.bind(this)}
                      onClick={this.handleClickColumn.bind(this, col)}
                    >
                      {col.name}
                    </text>
                  </g>
                })
              }
              {
                filteredRows.map((row, i) => {
                  return <g key={i} transform={`translate(0,${i * cellHeight})`}>
                    <text
                      x='-10'
                      y='14'
                      textAnchor='end'
                      fill={selectedRows.has(row.name) ? selectedFillColor : fillColor}
                      onMouseOver={this.handleMouseOverRow.bind(this, row)}
                      onMouseLeave={this.handleMouseLeaveRow.bind(this)}
                      onClick={this.handleClickRow.bind(this, row)}
                    >
                      {row.name}
                    </text>
                    <g>{
                      filteredCols.map((col, j) => {
                        return edges.has(`${row.name}:${col.name}`) ? <rect
                          key={j}
                          transform={`translate(${j * cellWidth},0)`}
                          x={cellMargin}
                          y={cellMargin}
                          width={cellWidth - cellMargin * 2}
                          height={cellHeight - cellMargin * 2}
                          fill={selectedCols.has(col.name) && selectedRows.has(row.name) ? selectedFillColor : fillColor}
                          onClick={this.handleClickEdge.bind(this, row, col)}
                          onMouseOver={this.handleMouseOverEdge.bind(this, row, col)}
                          onMouseLeave={this.handleMouseLeaveEdge.bind(this)} /> : ''
                      })
                    }</g>
                  </g>
                })
              }
            </g>
          </g>
        </svg>
      </div>
    </div>
  }

  handleClickEdge (row, col) {
    const biclusters = this.state.filteredBiclusters.filter(({colSet, rowSet}) => colSet.has(col.name) && rowSet.has(row.name))
    this.setState({
      filteredBiclusters: biclusters,
      filteredRows: this.state.rows.filter((row) => biclusters.some(({rowSet}) => rowSet.has(row.name))),
      filteredCols: this.state.cols.filter((col) => biclusters.some(({colSet}) => colSet.has(col.name)))
    })
    this.clearSelection()
  }

  handleMouseOverEdge (row, col) {
    const biclusterIndices = this.state.biclusters
      .filter(({colSet, rowSet}) => colSet.has(col.name) && rowSet.has(row.name))
      .map(({index}) => index)
    this.setState({
      selectedBiclusters: new Set(biclusterIndices),
      selectedRows: new Set([row.name]),
      selectedCols: new Set([col.name])
    })
  }

  handleMouseLeaveEdge () {
    this.clearSelection()
  }

  handleClickBicluster (index) {
    const {colSet, rowSet} = this.state.biclusters[index]
    this.setState({
      filteredBiclusters: this.state.biclusters.filter((b) => b.index === index),
      filteredRows: this.state.rows.filter((row) => rowSet.has(row.name)),
      filteredCols: this.state.cols.filter((col) => colSet.has(col.name))
    })
    this.clearSelection()
  }

  handleMouseOverBicluster (index) {
    const {colSet, rowSet} = this.state.biclusters[index]
    this.setState({
      selectedBiclusters: new Set([index]),
      selectedRows: rowSet,
      selectedCols: colSet
    })
  }

  handleMouseLeaveBicluster () {
    this.clearSelection()
  }

  handleMouseOverColumn (col) {
    const {biclusters, edges} = this.state
    const selectedBiclusters = biclusters.filter((b) => b.colSet.has(col.name))
    const selectedRows = new Set()
    for (const b of selectedBiclusters) {
      for (const row of b.rows) {
        if (edges.has(`${row}:${col.name}`)) {
          selectedRows.add(row)
        }
      }
    }
    this.setState({
      selectedBiclusters: new Set(selectedBiclusters.map((b) => b.index)),
      selectedRows,
      selectedCols: new Set([col.name])
    })
  }

  handleMouseLeaveColumn () {
    this.clearSelection()
  }

  handleClickColumn (col) {
    const filteredBiclusters = this.state.filteredBiclusters.filter((b) => b.colSet.has(col.name))
    const rowSet = new Set()
    const colSet = new Set()
    for (const b of filteredBiclusters) {
      for (const row of b.rows) {
        rowSet.add(row)
      }
      for (const col of b.cols) {
        colSet.add(col)
      }
    }
    this.setState({
      filteredBiclusters: filteredBiclusters,
      filteredRows: this.state.rows.filter((row) => rowSet.has(row.name)),
      filteredCols: this.state.cols.filter((col) => colSet.has(col.name))
    })
    this.clearSelection()
  }

  handleMouseOverRow (row) {
    const {biclusters, edges} = this.state
    const selectedBiclusters = biclusters.filter((b) => b.rowSet.has(row.name))
    const selectedCols = new Set()
    for (const b of selectedBiclusters) {
      for (const col of b.cols) {
        if (edges.has(`${row.name}:${col}`)) {
          selectedCols.add(col)
        }
      }
    }
    this.setState({
      selectedBiclusters: new Set(selectedBiclusters.map((b) => b.index)),
      selectedRows: new Set([row.name]),
      selectedCols
    })
  }

  handleMouseLeaveRow () {
    this.clearSelection()
  }

  handleClickRow (row) {
    const filteredBiclusters = this.state.filteredBiclusters.filter((b) => b.rowSet.has(row.name))
    const rowSet = new Set()
    const colSet = new Set()
    for (const b of filteredBiclusters) {
      for (const row of b.rows) {
        rowSet.add(row)
      }
      for (const col of b.cols) {
        colSet.add(col)
      }
    }
    this.setState({
      filteredBiclusters: filteredBiclusters,
      filteredRows: this.state.rows.filter((row) => rowSet.has(row.name)),
      filteredCols: this.state.cols.filter((col) => colSet.has(col.name))
    })
    this.clearSelection()
  }

  clearSelection () {
    this.setState({
      selectedBiclusters: new Set(),
      selectedRows: new Set(),
      selectedCols: new Set()
    })
  }

  handleClickClearButton () {
    const {biclusters, cols, rows} = this.state
    this.setState({
      filteredBiclusters: biclusters,
      filteredCols: cols,
      filteredRows: rows
    })
  }
}

d3.csv('data.csv', (data) => {
  render(<App data={data} />, document.getElementById('content'))
})
