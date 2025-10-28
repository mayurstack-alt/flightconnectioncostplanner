{/* <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> */}
    
        let supabaseClient = null;
        let n = 0;
        let city = [];
        let graph = []; // Single graph for all airlines
        const INF = 99999;

        const airlines = ['IndiGo', 'Air India', 'SpiceJet', 'Vistara', 'GoAir'];
        const airlineColors = {
            'IndiGo': 'indigo',
            'Air India': 'airindia',
            'SpiceJet': 'spicejet',
            'Vistara': 'vistara',
            'GoAir': 'goair'
        };
        const airlineIcons = {
            'IndiGo': 'IG',
            'Air India': 'AI',
            'SpiceJet': 'SJ',
            'Vistara': 'VT',
            'GoAir': 'GA'
        };

        // GST rates and surcharges per airline (hardcoded)
        const airlineGST = {
            'IndiGo': 0.05,      // 5% GST
            'Air India': 0.12,   // 12% GST
            'SpiceJet': 0.08,    // 8% GST
            'Vistara': 0.10,     // 10% GST
            'GoAir': 0.06        // 6% GST
        };

        const airlineSurcharge = {
            'IndiGo': 200,       // 200 INR surcharge
            'Air India': 150,    // 150 INR surcharge
            'SpiceJet': 180,     // 180 INR surcharge
            'Vistara': 250,      // 250 INR surcharge
            'GoAir': 175         // 175 INR surcharge
        };

        /**
         * Calculate final cost with GST and surcharge for a given airline
         * Formula: finalCost = baseCost + (baseCost × GST) + surcharge
         * @param {number} baseCost - Base flight cost
         * @param {string} airlineName - Name of the airline
         * @returns {number} Final calculated cost
         */
        function calculateFinalCost(baseCost, airlineName) {
            if (baseCost === INF) return INF;
            
            const gstRate = airlineGST[airlineName];
            const surcharge = airlineSurcharge[airlineName];
            
            const gstAmount = baseCost * gstRate;
            const finalCost = baseCost + gstAmount + surcharge;
            
            return Math.round(finalCost); // Round to nearest integer
        }

        /**
         * Create airline-specific graph with GST and surcharges applied to each edge
         * This ensures different shortest paths for different airlines
         * @param {string} airlineName - Name of the airline
         * @returns {array} Modified graph with airline-specific costs
         */
        function createAirlineGraph(airlineName) {
            const airlineGraph = [];
            for (let i = 0; i < n; i++) {
                airlineGraph[i] = [];
                for (let j = 0; j < n; j++) {
                    if (graph[i][j] === INF || i === j) {
                        airlineGraph[i][j] = graph[i][j];
                    } else {
                        // Apply GST and surcharge to each edge
                        airlineGraph[i][j] = calculateFinalCost(graph[i][j], airlineName);
                    }
                }
            }
            return airlineGraph;
        }

        /**
         * Get cost breakdown for display
         * @param {number} baseCost - Base flight cost
         * @param {string} airlineName - Name of the airline
         * @returns {object} Cost breakdown with base, GST, surcharge, and total
         */
        function getCostBreakdown(baseCost, airlineName) {
            if (baseCost === INF) {
                return { base: INF, gst: 0, surcharge: 0, total: INF };
            }
            
            const gstRate = airlineGST[airlineName];
            const surcharge = airlineSurcharge[airlineName];
            const gstAmount = Math.round(baseCost * gstRate);
            const total = Math.round(baseCost + gstAmount + surcharge);
            
            return {
                base: baseCost,
                gst: gstAmount,
                gstRate: (gstRate * 100) + '%',
                surcharge: surcharge,
                total: total
            };
        }

        // Check for saved credentials on page load
        window.addEventListener('DOMContentLoaded', function() {
            const savedUrl = localStorage.getItem('supabaseUrl');
            const savedKey = localStorage.getItem('supabaseKey');
            
            if (savedUrl && savedKey) {
                document.getElementById('supabaseUrl').value = savedUrl;
                document.getElementById('supabaseKey').value = savedKey;
                autoConnect();
            }
        });

        async function autoConnect() {
            const url = localStorage.getItem('supabaseUrl');
            const key = localStorage.getItem('supabaseKey');
            
            if (url && key) {
                try {
                    supabaseClient = supabase.createClient(url, key);
                    const { data, error } = await supabaseClient.from('routes').select('id').limit(1);
                    
                    if (!error) {
                        document.getElementById('connectionForm').classList.add('hidden');
                        document.getElementById('connectionStatus').classList.remove('hidden');
                        document.getElementById('graphSetupCard').classList.remove('hidden');
                        document.getElementById('calculateCard').classList.remove('hidden');
                    }
                } catch (error) {
                    console.error('Auto-connect failed:', error);
                }
            }
        }

        async function connectDatabase() {
            const url = document.getElementById('supabaseUrl').value.trim();
            const key = document.getElementById('supabaseKey').value.trim();
            
            const errorDiv = document.getElementById('dbError');
            const successDiv = document.getElementById('dbSuccess');
            
            errorDiv.classList.remove('active');
            successDiv.classList.remove('active');

            if (!url || !key) {
                errorDiv.textContent = 'Please enter both Supabase URL and API Key';
                errorDiv.classList.add('active');
                return;
            }

            try {
                supabaseClient = supabase.createClient(url, key);
                const { data, error } = await supabaseClient.from('routes').select('id').limit(1);
                
                if (error) throw error;

                localStorage.setItem('supabaseUrl', url);
                localStorage.setItem('supabaseKey', key);

                successDiv.textContent = '✓ Successfully connected to database! Credentials saved.';
                successDiv.classList.add('active');
                
                setTimeout(() => {
                    document.getElementById('connectionForm').classList.add('hidden');
                    document.getElementById('connectionStatus').classList.remove('hidden');
                    document.getElementById('graphSetupCard').classList.remove('hidden');
                    document.getElementById('calculateCard').classList.remove('hidden');
                }, 1500);
                
            } catch (error) {
                errorDiv.textContent = 'Connection failed: ' + error.message;
                errorDiv.classList.add('active');
            }
        }

        function disconnectDatabase() {
            localStorage.removeItem('supabaseUrl');
            localStorage.removeItem('supabaseKey');
            
            supabaseClient = null;
            document.getElementById('supabaseUrl').value = '';
            document.getElementById('supabaseKey').value = '';
            document.getElementById('connectionForm').classList.remove('hidden');
            document.getElementById('connectionStatus').classList.add('hidden');
            document.getElementById('dbSuccess').classList.remove('active');
            
            document.getElementById('graphSetupCard').classList.add('hidden');
            document.getElementById('calculateCard').classList.add('hidden');
            document.getElementById('airlineResultsCard').classList.add('hidden');
            document.getElementById('databaseCard').classList.add('hidden');
        }

        function generateMatrix() {
            const numCities = parseInt(document.getElementById('numCities').value);
            const cityNamesInput = document.getElementById('cityNames').value.trim();
            const errorDiv = document.getElementById('graphError');
            
            errorDiv.classList.remove('active');

            if (!numCities || numCities < 2 || numCities > 10) {
                errorDiv.textContent = 'Please enter a valid number of cities (2-10)';
                errorDiv.classList.add('active');
                return;
            }

            if (!cityNamesInput) {
                errorDiv.textContent = 'Please enter city names';
                errorDiv.classList.add('active');
                return;
            }

            city = cityNamesInput.split(',').map(c => c.trim()).filter(c => c);
            
            if (city.length !== numCities) {
                errorDiv.textContent = `Please enter exactly ${numCities} city names`;
                errorDiv.classList.add('active');
                return;
            }

            n = numCities;
            
            // Generate single matrix
            let html = '<table class="matrix-table"><thead><tr><th></th>';
            city.forEach(c => {
                html += `<th>${c}</th>`;
            });
            html += '</tr></thead><tbody>';

            for (let i = 0; i < n; i++) {
                html += `<tr><th>${city[i]}</th>`;
                for (let j = 0; j < n; j++) {
                    const value = i === j ? 0 : '';
                    const disabled = i === j ? 'disabled' : '';
                    html += `<td><input type="text" id="cell_${i}_${j}" value="${value}" ${disabled} placeholder="Cost"></td>`;
                }
                html += '</tr>';
            }
            html += '</tbody></table>';

            document.getElementById('matrixContainer').innerHTML = html;
            document.getElementById('matrixSection').classList.remove('hidden');
        }

        function saveGraph() {
            const errorDiv = document.getElementById('graphError');
            errorDiv.classList.remove('active');

            graph = [];
            for (let i = 0; i < n; i++) {
                graph[i] = [];
                for (let j = 0; j < n; j++) {
                    const input = document.getElementById(`cell_${i}_${j}`);
                    if (!input) continue;
                    
                    const val = input.value.trim();
                    if (val.toUpperCase() === 'INF' || val === '') {
                        graph[i][j] = INF;
                    } else {
                        const num = parseFloat(val);
                        graph[i][j] = isNaN(num) ? INF : num;
                    }
                }
            }

            // Check for negative edges
            const hasNegEdge = hasNegativeEdgeInGraph(graph);
            if (hasNegEdge) {
                document.getElementById('negativeEdgeWarning').style.display = 'block';
            } else {
                document.getElementById('negativeEdgeWarning').style.display = 'none';
            }

            // Populate source city dropdown
            const sourceSelect = document.getElementById('sourceCity');
            sourceSelect.innerHTML = '';
            city.forEach(c => {
                sourceSelect.innerHTML += `<option value="${c}">${c}</option>`;
            });
        }

        function hasNegativeEdgeInGraph(graph) {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    if (graph[i][j] !== INF && graph[i][j] < 0) {
                        return true;
                    }
                }
            }
            return false;
        }

        function dijkstra(graph, src) {
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
                    const w = (typeof graph[u][v] === 'number') ? graph[u][v] : INF;
                    if (!visited[v] && w !== INF) {
                        const alt = dist[u] + w;
                        if (alt < dist[v]) dist[v] = alt;
                    }
                }
            }

            return dist;
        }

        function bellmanFord(graph, src) {
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

            return { dist, negativeCycle };
        }

        function floydWarshall(graph) {
            const dist = Array.from({ length: n }, (_, i) => 
                Array.from({ length: n }, (_, j) => {
                    const v = graph[i][j];
                    return (typeof v === 'number') ? v : INF;
                })
            );

            for (let i = 0; i < n; i++) dist[i][i] = Math.min(dist[i][i], 0);

            for (let k = 0; k < n; k++)
                for (let i = 0; i < n; i++)
                    for (let j = 0; j < n; j++)
                        if (dist[i][k] !== INF && dist[k][j] !== INF && 
                            dist[i][k] + dist[k][j] < dist[i][j])
                            dist[i][j] = dist[i][k] + dist[k][j];

            return dist;
        }

        async function calculateAirlineRoutes() {
            const algorithm = document.getElementById('algorithm').value;
            const sourceName = document.getElementById('sourceCity').value;
            const errorDiv = document.getElementById('calcError');
            const successDiv = document.getElementById('calcSuccess');
            
            errorDiv.classList.remove('active');
            successDiv.classList.remove('active');

            const srcIdx = city.indexOf(sourceName);
            if (srcIdx === -1) {
                errorDiv.textContent = 'City not found!';
                errorDiv.classList.add('active');
                return;
            }

            // Get selected airlines
            const selectedAirlines = [];
            airlines.forEach(airlineName => {
                const checkbox = document.getElementById(`airline_${airlineName.toLowerCase().replace(/\s+/g, '')}`);
                if (checkbox && checkbox.checked) {
                    selectedAirlines.push(airlineName);
                }
            });

            if (selectedAirlines.length === 0) {
                errorDiv.textContent = 'Please select at least one airline!';
                errorDiv.classList.add('active');
                return;
            }

            const algorithmName = algorithm === 'dijkstra' ? 'Dijkstra' : 
                                algorithm === 'bellman-ford' ? 'Bellman-Ford' : 'Floyd-Warshall';

            // Calculate base distances using the same graph for all airlines
            let baseDist;
            let hasError = false;

            if (algorithm === 'dijkstra') {
                if (hasNegativeEdgeInGraph(graph)) {
                    errorDiv.textContent = 'Graph has negative edges. Dijkstra is not applicable!';
                    errorDiv.classList.add('active');
                    return;
                }
                baseDist = dijkstra(graph, srcIdx);
            } else if (algorithm === 'bellman-ford') {
                const result = bellmanFord(graph, srcIdx);
                if (result.negativeCycle) {
                    errorDiv.textContent = 'Negative-weight cycle detected!';
                    errorDiv.classList.add('active');
                    return;
                }
                baseDist = result.dist;
            } else if (algorithm === 'floyd-warshall') {
                const allDist = floydWarshall(graph);
                baseDist = allDist[srcIdx];
            }

            // Create results for each selected airline with GST and surcharge calculations
            const airlineResults = [];
            let totalInserted = 0;

            for (const airlineName of selectedAirlines) {
                let totalCost = 0;
                let reachableCount = 0;
                const destinations = [];

                // Calculate final costs for each destination with GST and surcharge
                for (let v = 0; v < n; v++) {
                    if (v !== srcIdx && baseDist[v] !== INF) {
                        const baseCost = baseDist[v];
                        const finalCost = calculateFinalCost(baseCost, airlineName);
                        const breakdown = getCostBreakdown(baseCost, airlineName);
                        
                        totalCost += finalCost;
                        reachableCount++;
                        destinations.push({
                            name: city[v],
                            baseCost: baseCost,
                            finalCost: finalCost,
                            breakdown: breakdown
                        });
                    }
                }

                airlineResults.push({
                    airline: airlineName,
                    totalCost: totalCost,
                    reachableCount: reachableCount,
                    destinations: destinations,
                    color: airlineColors[airlineName],
                    icon: airlineIcons[airlineName],
                    gstRate: (airlineGST[airlineName] * 100) + '%',
                    surcharge: airlineSurcharge[airlineName]
                });

                // Store in database with final costs (including GST and surcharge)
                const rowsToInsert = [];
                for (let v = 0; v < n; v++) {
                    if (v !== srcIdx && baseDist[v] !== INF) {
                        const baseCost = baseDist[v];
                        const finalCost = calculateFinalCost(baseCost, airlineName);
                        const breakdown = getCostBreakdown(baseCost, airlineName);
                        
                        rowsToInsert.push({
                            airline: airlineName,
                            source: city[srcIdx],
                            destination: city[v],
                            base_cost: baseCost,
                            gst_amount: breakdown.gst,
                            surcharge: breakdown.surcharge,
                            cost: finalCost, // Final cost with GST and surcharge
                            algorithm_used: algorithmName
                        });
                    }
                }

                if (rowsToInsert.length > 0) {
                    try {
                        const { data: insertData, error: insertErr } = await supabaseClient
                            .from('routes')
                            .insert(rowsToInsert)
                            .select();
                        
                        if (!insertErr) {
                            totalInserted += insertData.length;
                        }
                    } catch (err) {
                        console.error(`Insert failed for ${airlineName}:`, err);
                    }
                }
            }

            // Display results
            displayAirlineResults(sourceName, airlineResults, algorithmName);

            if (totalInserted > 0) {
                successDiv.textContent = `✓ Stored ${totalInserted} result(s) across ${airlineResults.length} airline(s) in database!`;
                successDiv.classList.add('active');
            }
        }

        function displayAirlineResults(source, results, algorithm) {
            // Sort by total cost to find best deal
            results.sort((a, b) => a.totalCost - b.totalCost);

            // Show best deal banner
            const bestDeal = results[0];
            const banner = document.getElementById('bestDealBanner');
            banner.innerHTML = `🏆 Best Deal: ${bestDeal.airline} with total cost of ₹${bestDeal.totalCost.toLocaleString()} (including GST & surcharges) for all routes from ${source}`;
            banner.classList.remove('hidden');

            // Display all airline cards with cost breakdowns
            const grid = document.getElementById('airlineResultsGrid');
            grid.innerHTML = '';

            results.forEach((result, index) => {
                const card = document.createElement('div');
                card.className = `airline-card ${result.color}`;
                
                // Build destinations HTML with cost breakdown
                let destinationsHTML = '';
                result.destinations.forEach(dest => {
                    destinationsHTML += `
                        <div style="margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.2);">
                            <div class="destination-item">
                                <span><strong>${dest.name}</strong></span>
                                <strong>₹${dest.finalCost.toLocaleString()}</strong>
                            </div>
                            <div class="cost-breakdown">
                                <div class="cost-breakdown-item">
                                    <span>Base Cost:</span>
                                    <span>₹${dest.breakdown.base.toLocaleString()}</span>
                                </div>
                                <div class="cost-breakdown-item">
                                    <span>GST (${dest.breakdown.gstRate}):</span>
                                    <span>₹${dest.breakdown.gst.toLocaleString()}</span>
                                </div>
                                <div class="cost-breakdown-item">
                                    <span>Surcharge:</span>
                                    <span>₹${dest.breakdown.surcharge.toLocaleString()}</span>
                                </div>
                                <div class="cost-breakdown-item cost-breakdown-total">
                                    <span>Final Cost:</span>
                                    <span>₹${dest.breakdown.total.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    `;
                });

                card.innerHTML = `
                    <h3>
                        <div class="airline-icon">${result.icon}</div>
                        ${result.airline}
                        ${index === 0 ? '<span style="font-size: 0.7em;">🏆</span>' : ''}
                    </h3>
                    <div class="airline-algorithm">Algorithm: ${algorithm}</div>
                    <div style="font-size: 0.9em; opacity: 0.9; margin-bottom: 10px;">
                        GST: ${result.gstRate} | Surcharge: ₹${result.surcharge}
                    </div>
                    <div class="airline-cost">₹${result.totalCost.toLocaleString()}</div>
                    <div style="font-size: 0.9em; opacity: 0.9;">Total cost for ${result.reachableCount} route(s)</div>
                    <div class="airline-destinations">
                        <h4>Routes from ${source}:</h4>
                        ${destinationsHTML}
                    </div>
                `;

                grid.appendChild(card);
            });

            document.getElementById('airlineResultsCard').classList.remove('hidden');
        }

        async function viewStoredResults() {
            try {
                const { data, error } = await supabaseClient
                    .from('routes')
                    .select('*')
                    .order('id', { ascending: true });

                if (error) throw error;

                const tbody = document.getElementById('databaseTableBody');
                tbody.innerHTML = '';

                if (!data || data.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No records found</td></tr>';
                } else {
                    const filteredData = data.filter(row => {
                        const source = row.source || '';
                        const dest = row.destination || '';
                        return source !== dest;
                    });

                    if (filteredData.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No records found</td></tr>';
                    } else {
                        filteredData.forEach(row => {
                            const tr = document.createElement('tr');
                            // Check if cost breakdown exists in database
                            const costDisplay = row.base_cost ? 
                                `₹${row.cost ? row.cost.toLocaleString() : '0'} (Base: ₹${row.base_cost}, GST: ₹${row.gst_amount || 0}, Surcharge: ₹${row.surcharge || 0})` :
                                `₹${row.cost ? row.cost.toLocaleString() : '0'}`;
                            
                            tr.innerHTML = `
                                <td>${row.id}</td>
                                <td><strong>${row.airline || '-'}</strong></td>
                                <td>${row.source || '-'}</td>
                                <td>${row.destination || '-'}</td>
                                <td>${costDisplay}</td>
                                <td>${row.algorithm_used || '-'}</td>
                            `;
                            tbody.appendChild(tr);
                        });
                    }
                }

                document.getElementById('databaseCard').classList.remove('hidden');

            } catch (error) {
                alert('Error loading stored results: ' + error.message);
            }
        }
