const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');
const INF = 99999;   // use 99999 as INF (matches your C/Python earlier)
const MAX = 10;
let n = 0;
let graph = [];
let city = [];
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}
async function hasNegativeEdge() {
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      if (graph[i][j] !== INF && graph[i][j] < 0)
        return true;
  return false;
}

function printDistances(src, dist) {
  console.log(`\nShortest distances from ${city[src]}:`);
  for (let i = 0; i < n; i++) {
    if (dist[i] === INF) {
      console.log(`To ${city[i].padEnd(10)} -> No Path`);
    } else {
      console.log(`To ${city[i].padEnd(10)} -> ${dist[i]}`);
    }
  }
}

function dijkstra(src) {
  const dist = new Array(n).fill(INF);
  const visited = new Array(n).fill(false);
  dist[src] = 0;

  for (let iter = 0; iter < n; iter++) {
    let u = -1;
    let best = INF + 1;
    for (let i = 0; i < n; i++) {
      if (!visited[i] && dist[i] < best) {
        best = dist[i];
        u = i;
      }
    }
    if (u === -1) break;
    visited[u] = true;

    for (let v = 0; v < n; v++) {
      // treat missing/invalid entries as INF
      const w = (typeof graph[u][v] === 'number') ? graph[u][v] : INF;
      if (!visited[v] && w !== INF) {
        const alt = dist[u] + w;
        if (alt < dist[v]) dist[v] = alt;
      }
    }
  }

  console.log(`\n[Dijkstra] Shortest path calculated for source city: ${city[src]}`);
  printDistances(src, dist);
  return dist;
}

function bellmanFord(src) {
  const dist = new Array(n).fill(INF);
  dist[src] = 0;

  for (let iter = 0; iter < n - 1; iter++) {
    let changed = false;
    for (let u = 0; u < n; u++) {
      if (dist[u] === INF) continue;
      for (let v = 0; v < n; v++) {
        const w = (typeof graph[u][v] === 'number') ? graph[u][v] : INF;
        if (w !== INF) {
          const alt = dist[u] + w;
          if (alt < dist[v]) {
            dist[v] = alt;
            changed = true;
          }
        }
      }
    }
    if (!changed) break;
  }

  // negative cycle check
  let negativeCycle = false;
  for (let u = 0; u < n; u++) {
    if (dist[u] === INF) continue;
    for (let v = 0; v < n; v++) {
      const w = (typeof graph[u][v] === 'number') ? graph[u][v] : INF;
      if (w !== INF && dist[u] + w < dist[v]) {
        negativeCycle = true;
        break;
      }
    }
    if (negativeCycle) break;
  }

  console.log(`\n[Bellman-Ford] Shortest path calculated for source city: ${city[src]}${negativeCycle ? ' (negative cycle detected)' : ''}`);
  if (!negativeCycle) printDistances(src, dist);
  return { dist, negativeCycle };
}

function floydWarshall() {
  const dist = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => {
    const v = graph[i][j];
    return (typeof v === 'number') ? v : INF;
  }));

  for (let i = 0; i < n; i++) dist[i][i] = Math.min(dist[i][i], 0);

  for (let k = 0; k < n; k++)
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        if (dist[i][k] !== INF && dist[k][j] !== INF && dist[i][k] + dist[k][j] < dist[i][j])
          dist[i][j] = dist[i][k] + dist[k][j];

  console.log(`\n[Floyd-Warshall] All-pairs shortest path calculated.`);
  console.log('\n    ' + city.map(c => c.padStart(10)).join(''));
  for (let i = 0; i < n; i++) {
    let row = city[i].padEnd(4);
    for (let j = 0; j < n; j++) {
      row += (dist[i][j] === INF ? 'INF'.padStart(10) : String(dist[i][j]).padStart(10));
    }
    console.log(row);
  }

  for (let i = 0; i < n; i++)
    if (dist[i][i] < 0) {
      console.log("\nGraph contains a negative weight cycle!");
      return;
    }
  return dist;
}

async function main() {
  // supabase client (prefer env vars, otherwise prompt the user)
  // For security do NOT hardcode service_role keys in source. Use SUPABASE_URL and SUPABASE_KEY
  // environment variables or paste a anon/public key when prompted at runtime.
  const supabaseUrl = process.env.SUPABASE_URL || await ask('Enter SUPABASE_URL: ');
  const supabaseKey = process.env.SUPABASE_KEY || await ask('Enter SUPABASE_KEY (anon/public key recommended): ');
  const client = createClient(supabaseUrl, supabaseKey);

  // basic health check
  try {
    let { error: testErr } = await client.from('routes').select('id').limit(1);
    if (testErr) {
      console.error('Supabase health-check failed:', testErr.message || testErr);
      // continue anyway, user might just want to test algorithms locally
    } else {
      console.log('Connected to Supabase OK (routes table accessible).');
    }
  } catch (e) {
    console.warn('Supabase check failed (continuing locally):', e.message || e);
  }

  n = parseInt(await ask("Enter number of cities: "), 10);
  city = [];
  console.log("\nEnter names of the cities:");
  for (let i = 0; i < n; i++) {
    const c = await ask(`City ${i + 1}: `);
    city.push(c.trim());
  }

  console.log(`\nEnter cost adjacency matrix (use ${INF} or 'INF' for no direct flight). Enter ${n} numbers per row:`);
  for (let i = 0; i < n; i++) {
    graph[i] = [];
    let rowStr = await ask(`Row ${i + 1}: `);
    let tokens = rowStr.trim().split(/\s+/);
    if (tokens.length < n) {
      console.log(`Row ${i+1} had only ${tokens.length} values. Please enter exactly ${n} values (use ${INF} or INF).`);
      i--;
      continue;
    }
    for (let j = 0; j < n; j++) {
      const t = tokens[j].toString().trim();
      if (t.toUpperCase() === 'INF') graph[i][j] = INF;
      else {
        const num = Number(t);
        graph[i][j] = Number.isFinite(num) ? num : INF;
      }
    }
  }

  // print matrix for debugging/confirmation
  console.log('\nAdjacency matrix:');
  console.log('    ' + city.map(c => c.padStart(10)).join(''));
  for (let i = 0; i < n; i++) {
    let row = city[i].padEnd(4);
    for (let j = 0; j < n; j++) {
      row += (graph[i][j] === INF ? 'INF'.padStart(10) : String(graph[i][j]).padStart(10));
    }
    console.log(row);
  }

  const negEdge = await hasNegativeEdge();

  while (true) {
    console.log("\n--- Flight Connection Cost Planner ---");
    console.log("1. Shortest Path (Dijkstra)");
    console.log("2. Shortest Path (Bellman-Ford)");
    console.log("3. All-Pairs Shortest Path (Floyd-Warshall)");
    console.log("4. View Stored Results (from Database)");
    console.log("5. Exit");
    const choice = Number(await ask("Enter choice: "));

    switch (choice) {
      case 1: {
        if (negEdge) {
          console.log("\nGraph has negative edges. Dijkstra is not applicable!");
          break;
        }
        const srcName = await ask("Enter source city name: ");
        const found = city.indexOf(srcName.trim());
        if (found === -1) {
          console.log("City not found!");
          break;
        }
        const dist = dijkstra(found);

        // insert reachable destinations
        const rowsToInsert = [];
        for (let v = 0; v < n; v++) {
          if (dist[v] !== INF) {
            rowsToInsert.push({
              source: city[found],
              destination: city[v],
              cost: dist[v],
              algorithm_used: 'Dijkstra'
            });
          }
        }
        if (rowsToInsert.length === 0) {
          console.log('No reachable destinations to store for this source.');
        } else {
          try {
            let { data: insertData, error: insertErr } = await client.from('routes').insert(rowsToInsert).select();
            if (insertErr) {
              console.error('Insert error:', insertErr);
            } else {
              console.log(`✓ Stored ${Array.isArray(insertData) ? insertData.length : 0} result(s) in database.`);
            }
          } catch (err) {
            console.error('Insert failed:', err);
          }
        }
        break;
      }

      case 2: {
        const srcName = await ask("Enter source city name: ");
        const found = city.indexOf(srcName.trim());
        if (found === -1) {
          console.log("City not found!");
          break;
        }
        const { dist, negativeCycle } = bellmanFord(found);
        if (negativeCycle) {
          console.log('Negative-weight cycle detected. Not storing results.');
          break;
        }

        const rowsToInsert = [];
        for (let v = 0; v < n; v++) {
          if (dist[v] !== INF) {
            rowsToInsert.push({
              source: city[found],
              destination: city[v],
              cost: dist[v],
              algorithm_used: 'Bellman-Ford'
            });
          }
        }

        if (rowsToInsert.length === 0) console.log('No reachable destinations to store for this source.');
        else {
          try {
            let { data: insertData, error: insertErr } = await client.from('routes').insert(rowsToInsert).select();
            if (insertErr) console.error('Insert error:', insertErr);
            else console.log(`✓ Stored ${Array.isArray(insertData) ? insertData.length : 0} result(s) in database.`);
          } catch (err) { console.error('Insert failed:', err); }
        }
        break;
      }

      case 3:
        floydWarshall();
        break;

      case 4: {
        try {
          let { data: rows, error: selectErr } = await client.from('routes').select('*');
          if (selectErr) {
            console.error('Select error:', selectErr);
            break;
          }
          console.log('\nStored Results in Database:');
          console.log('ID | Source | Destination | Cost | Algorithm');
          console.log('-------------------------------------------------');
          if (!rows || rows.length === 0) console.log('(no rows)');
          else rows.forEach(r => {
            console.log(`${r.id || ''} | ${r.source || r.source_city || ''} | ${r.destination || r.destination_city || ''} | ${r.cost || ''} | ${r.algorithm_used || r.algorithm || ''}`);
          });
        } catch (err) {
          console.error('Error retrieving data:', err);
        }
        break;
      }

      case 5:
        console.log("Exiting program. Goodbye!");
        rl.close();
        return;

      default:
        console.log("Invalid choice!");
    }
  }
}
main();


