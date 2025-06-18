// Global variables
let analysisData = null;
let currentStep = 0;

// Persist API keys in localStorage
// Load any saved keys when the page loads
document.addEventListener('DOMContentLoaded', loadStoredCredentials);
function loadStoredCredentials() {
    try {
        const perplexity = localStorage.getItem('perplexityKey');
        if (perplexity) document.getElementById('perplexity-key').value = perplexity;

        const dfsUser = localStorage.getItem('dataforseoUsername');
        if (dfsUser) document.getElementById('dataforseo-username').value = dfsUser;

        const dfsPass = localStorage.getItem('dataforseoPassword');
        if (dfsPass) document.getElementById('dataforseo-password').value = dfsPass;

        const fcKey = localStorage.getItem('firecrawlKey');
        const fcInput = document.getElementById('firecrawl-key');
        if (fcKey && fcInput) fcInput.value = fcKey;
    } catch (err) {
        console.warn('Unable to load stored credentials:', err);
    }
}

function saveCredentials(perplexityKey, dataforSeoUsername, dataforSeoPassword, firecrawlKey) {
    try {
        localStorage.setItem('perplexityKey', perplexityKey);
        localStorage.setItem('dataforseoUsername', dataforSeoUsername);
        localStorage.setItem('dataforseoPassword', dataforSeoPassword);
        if (firecrawlKey !== undefined) localStorage.setItem('firecrawlKey', firecrawlKey);
    } catch (err) {
        console.warn('Unable to save credentials:', err);
    }
}

// Main analysis function
async function startAnalysis() {
    // Get form data
    const keywordTopic = document.getElementById('keyword-topic').value.trim();
    const businessType = document.getElementById('business-type').value;
    const perplexityKey = document.getElementById('perplexity-key').value.trim();
    const dataforSeoUsername = document.getElementById('dataforseo-username').value.trim();
    const dataforSeoPassword = document.getElementById('dataforseo-password').value.trim();

    // Validate inputs
    if (!keywordTopic || !perplexityKey || !dataforSeoUsername || !dataforSeoPassword) {
        showError('Please fill in the keyword topic and all required API credentials.');
        return;
    }

    // Save credentials for next visit
    saveCredentials(perplexityKey, dataforSeoUsername, dataforSeoPassword);

    // Hide form and show progress
    document.getElementById('input-form').style.display = 'none';
    document.getElementById('progress-section').classList.remove('hidden');
    document.getElementById('error-section').classList.add('hidden');
    document.getElementById('results-section').classList.add('hidden');

    try {
        // Step 1: Generate keywords
        updateProgress(1, 'Generating seed keywords with AI...');
        const seedKeywords = await generateKeywordsFromTopic(keywordTopic, businessType, perplexityKey);

        // Step 2: Get keyword data (parallel API calls)
        updateProgress(2, 'Getting search volumes and competitor data...');
        const [keywordMetrics, relatedKeywords, serpData] = await Promise.all([
            getKeywordMetrics(seedKeywords, dataforSeoUsername, dataforSeoPassword),
            getRelatedKeywords(seedKeywords, dataforSeoUsername, dataforSeoPassword),
            getSerpData(seedKeywords, dataforSeoUsername, dataforSeoPassword)
        ]);

        // Step 3: Analyze and cluster
        updateProgress(3, 'Analyzing competitors and clustering keywords...');
        const clusters = await analyzeAndCluster(keywordMetrics, relatedKeywords, serpData, businessType);

        // Step 4: Generate report
        updateProgress(4, 'Generating final report...');
        const report = generateReport(keywordTopic, businessType, clusters);

        // Show results
        analysisData = report;
        showResults(report);

    } catch (error) {
        console.error('Analysis failed:', error);
        showError(`Analysis failed: ${error.message}`);
    }
}

// Generate keywords directly from a user-provided topic
async function generateKeywordsFromTopic(topic, businessType, apiKey) {
    const prompt = `Generate 30 high-commercial-intent seed keywords for the topic \"${topic}\" related to a ${businessType} business.\\n\\nFocus on:\\n1. High commercial intent (\\"buy\\", \\"best\\", \\"services\\")\\n2. Problem-solving intent\\n3. Comparison & review phrases\\n4. Industry-specific long-tail phrases\\n5. Local variations where appropriate\\n\\nReturn ONLY a JSON array of keyword strings, no explanations:`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
                { role: 'system', content: `You are an expert SEO strategist specializing in ${businessType} businesses.` },
                { role: 'user', content: prompt }
            ],
            max_tokens: 800,
            temperature: 0.2
        })
    });

    if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content_text = data.choices[0].message.content.trim();

    let keywords = [];
    try {
        keywords = JSON.parse(content_text);
    } catch (e) {
        const lines = content_text.split('\n');
        keywords = lines
            .map(line => line.replace(/^[\d\-\*\.\s\[\]"']+/, '').replace(/["'\]\[]/g, '').trim())
            .filter(kw => kw.length > 3 && kw.length < 100)
            .slice(0, 30);
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
        throw new Error('Failed to generate keywords for the provided topic.');
    }

    return keywords.slice(0, 25);
}

// Step 1: Scrape website
async function scrapeWebsite(url, apiKey) {
    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            url: url,
            formats: ['markdown'],
            includeTags: ['title', 'meta', 'h1', 'h2', 'h3', 'p'],
            onlyMainContent: true,
            waitFor: 2000
        })
    });

    if (!response.ok) {
        throw new Error(`Firecrawl API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error('Failed to scrape website. Please check the URL and try again.');
    }

    return data.data;
}

// Step 2: Generate keywords
async function generateKeywords(url, websiteData, businessType, apiKey) {
    const title = websiteData.metadata?.title || 'N/A';
    const description = websiteData.metadata?.description || 'N/A';
    const content = websiteData.markdown?.substring(0, 1500) || '';

    const prompt = `Analyze this ${businessType} website and generate 30 high-commercial-intent seed keywords:

Website: ${url}
Business Type: ${businessType}
Title: ${title}
Description: ${description}
Content: ${content}

Based on this analysis, generate 30 seed keywords that potential customers would search for. Focus on:
1. High commercial intent ("buy", "best", "services")
2. Problem-solving keywords
3. Comparison and review terms
4. Industry-specific long-tail keywords
5. Local variations where applicable

Return ONLY a JSON array of keyword strings, no explanations:`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
                { role: 'system', content: `You are an expert SEO strategist specializing in ${businessType} businesses.` },
                { role: 'user', content: prompt }
            ],
            max_tokens: 800,
            temperature: 0.2
        })
    });

    if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content_text = data.choices[0].message.content.trim();

    let keywords = [];
    try {
        keywords = JSON.parse(content_text);
    } catch (e) {
        // Parse from text format
        const lines = content_text.split('\n');
        keywords = lines
            .map(line => line.replace(/^[\d\-\*\.\s\[\]"']+/, '').replace(/["'\]\[]/g, '').trim())
            .filter(kw => kw.length > 3 && kw.length < 100)
            .slice(0, 30);
    }

    if (!Array.isArray(keywords) || keywords.length === 0) {
        throw new Error('Failed to generate keywords from website content.');
    }

    return keywords.slice(0, 25); // Limit for API efficiency
}

// Step 3a: Get keyword metrics
async function getKeywordMetrics(keywords, username, password) {
    const credentials = btoa(`${username}:${password}`);

    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
            keywords: keywords,
            location_code: 2840, // United States
            language_code: 'en',
            include_serp_info: true,
            include_clickstream_data: true
        }])
    });

    if (!response.ok) {
        throw new Error(`DataForSEO keyword metrics error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

// Step 3b: Get related keywords
async function getRelatedKeywords(keywords, username, password) {
    const credentials = btoa(`${username}:${password}`);

    const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
            keywords: keywords.slice(0, 10),
            location_code: 2840,
            language_code: 'en',
            include_serp_info: true,
            limit: 500,
            order_by: ['search_volume,desc']
        }])
    });

    if (!response.ok) {
        throw new Error(`DataForSEO related keywords error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

// Step 3c: Get SERP data
async function getSerpData(keywords, username, password) {
    const credentials = btoa(`${username}:${password}`);

    const serpRequests = keywords.slice(0, 8).map(keyword => ({
        keyword: keyword,
        location_code: 2840,
        language_code: 'en',
        device: 'desktop',
        depth: 5
    }));

    const response = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(serpRequests)
    });

    if (!response.ok) {
        throw new Error(`DataForSEO SERP error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

// Step 4: Analyze and cluster keywords
async function analyzeAndCluster(keywordMetrics, relatedKeywords, serpData, businessType) {
    const keywordDB = new Map();

    // Process keyword metrics
    const volumeResults = keywordMetrics.tasks?.[0]?.result || [];
    volumeResults.forEach(item => {
        if (item.keyword && item.search_volume > 0) {
            keywordDB.set(item.keyword, {
                keyword: item.keyword,
                search_volume: item.search_volume,
                cpc: item.cpc || 0,
                competition: item.competition || 0,
                competition_level: item.competition_level || 'unknown',
                keyword_difficulty: 0,
                serp_urls: [],
                commercial_score: calculateCommercialScore(item, businessType),
                is_seed: true
            });
        }
    });

    // Add related keywords
    const relatedResults = relatedKeywords.tasks?.[0]?.result || [];
    relatedResults
        .filter(item => item.search_volume > 100)
        .slice(0, 200)
        .forEach(item => {
            if (!keywordDB.has(item.keyword)) {
                keywordDB.set(item.keyword, {
                    keyword: item.keyword,
                    search_volume: item.search_volume,
                    cpc: item.cpc || 0,
                    competition: item.competition || 0,
                    competition_level: item.competition_level || 'unknown',
                    keyword_difficulty: 0,
                    serp_urls: [],
                    commercial_score: calculateCommercialScore(item, businessType),
                    is_seed: false
                });
            }
        });

    // Process SERP data
    const serpResults = serpData.tasks || [];
    serpResults.forEach(task => {
        if (task.result?.[0]?.items) {
            const keyword = task.data?.[0]?.keyword;
            const items = task.result[0].items;

            if (keyword && keywordDB.has(keyword)) {
                const organicResults = items.filter(item => item.type === 'organic');
                const topUrls = organicResults.slice(0, 5).map(item => ({
                    url: item.url,
                    title: item.title,
                    domain: extractDomain(item.url),
                    position: item.rank_group || item.rank_absolute
                }));

                keywordDB.get(keyword).serp_urls = topUrls;
                keywordDB.get(keyword).keyword_difficulty = calculateDifficulty(organicResults);
            }
        }
    });

    // Create clusters
    const keywordsArray = Array.from(keywordDB.values()).filter(kw => kw.search_volume > 50);
    return createClusters(keywordsArray);
}

// Helper functions
function calculateCommercialScore(keywordData, businessType) {
    const volume = keywordData.search_volume || 0;
    const cpc = keywordData.cpc || 0;
    const competition = keywordData.competition || 0;
    const keyword = keywordData.keyword.toLowerCase();

    let intentMultiplier = 1;

    if (keyword.includes('buy') || keyword.includes('purchase') || keyword.includes('order')) {
        intentMultiplier = 2.5;
    } else if (keyword.includes('best') || keyword.includes('top') || keyword.includes('review')) {
        intentMultiplier = 2;
    } else if (keyword.includes('price') || keyword.includes('cost') || keyword.includes('cheap')) {
        intentMultiplier = 1.8;
    }

    return Math.round(volume * cpc * intentMultiplier * (1 + competition));
}

function extractDomain(url) {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return url.split('/')[2]?.replace('www.', '') || url;
    }
}

function calculateDifficulty(organicResults) {
    if (!organicResults || organicResults.length === 0) return 0;

    let difficulty = 0;
    const highAuthorityDomains = ['wikipedia.org', 'amazon.com', 'youtube.com', 'facebook.com'];

    organicResults.slice(0, 10).forEach((result, index) => {
        const domain = extractDomain(result.url);
        const positionWeight = (10 - index) / 10;

        if (highAuthorityDomains.some(haDomain => domain.includes(haDomain))) {
            difficulty += 25 * positionWeight;
        } else if (domain.length > 20) {
            difficulty += 15 * positionWeight;
        } else {
            difficulty += 8 * positionWeight;
        }
    });

    return Math.min(100, Math.round(difficulty));
}

function createClusters(keywords) {
    const clusters = [];
    const processed = new Set();
    const sortedKeywords = keywords.sort((a, b) => b.commercial_score - a.commercial_score);

    sortedKeywords.forEach(keyword => {
        if (processed.has(keyword.keyword)) return;

        const cluster = {
            cluster_id: clusters.length + 1,
            main_keyword: keyword.keyword,
            theme: identifyTheme(keyword.keyword),
            keywords: [keyword],
            total_search_volume: keyword.search_volume,
            avg_cpc: keyword.cpc,
            avg_difficulty: keyword.keyword_difficulty,
            total_commercial_score: keyword.commercial_score,
            competitor_domains: [...new Set(keyword.serp_urls.map(url => url.domain))]
        };

        // Find related keywords
        const mainWords = keyword.keyword.toLowerCase().split(' ');
        sortedKeywords.forEach(otherKeyword => {
            if (processed.has(otherKeyword.keyword) || otherKeyword.keyword === keyword.keyword) return;

            const otherWords = otherKeyword.keyword.toLowerCase().split(' ');
            const commonWords = mainWords.filter(word => otherWords.includes(word) && word.length > 3);

            if (commonWords.length >= Math.min(mainWords.length, otherWords.length) * 0.5 && cluster.keywords.length < 10) {
                cluster.keywords.push(otherKeyword);
                cluster.total_search_volume += otherKeyword.search_volume;
                cluster.avg_cpc = (cluster.avg_cpc + otherKeyword.cpc) / 2;
                cluster.avg_difficulty = (cluster.avg_difficulty + otherKeyword.keyword_difficulty) / 2;
                cluster.total_commercial_score += otherKeyword.commercial_score;
                processed.add(otherKeyword.keyword);
            }
        });

        processed.add(keyword.keyword);
        clusters.push(cluster);
    });

    return clusters.sort((a, b) => b.total_commercial_score - a.total_commercial_score).slice(0, 10);
}

function identifyTheme(keyword) {
    const kw = keyword.toLowerCase();
    if (kw.includes('buy') || kw.includes('purchase')) return '💰 Purchase Intent';
    if (kw.includes('best') || kw.includes('top') || kw.includes('review')) return '🔍 Research & Comparison';
    if (kw.includes('how to') || kw.includes('guide')) return '📚 Educational';
    if (kw.includes('price') || kw.includes('cost')) return '💲 Price Research';
    return '🎯 General';
}

// Step 5: Generate report
function generateReport(topic, businessType, clusters) {
    const totalSearchVolume = clusters.reduce((sum, c) => sum + c.total_search_volume, 0);
    const avgCPC = clusters.reduce((sum, c) => sum + c.avg_cpc, 0) / clusters.length;
    const estimatedTraffic = Math.round(totalSearchVolume * 0.3);
    const allCompetitors = [...new Set(clusters.flatMap(c => c.competitor_domains))].filter(d => d);

    return {
        analysis_summary: {
            source_topic: topic,
            business_type: businessType,
            analysis_date: new Date().toISOString(),
            total_keywords_analyzed: clusters.reduce((sum, c) => sum + c.keywords.length, 0),
            clusters_identified: clusters.length,
            total_monthly_search_volume: totalSearchVolume,
            estimated_monthly_traffic_potential: estimatedTraffic,
            avg_cpc: avgCPC
        },
        clusters: clusters,
        quick_wins: clusters.filter(c => c.avg_difficulty < 35).slice(0, 5),
        high_value: clusters.filter(c => c.total_commercial_score > 5000).slice(0, 5),
        competitors: allCompetitors.slice(0, 10)
    };
}

// UI Helper functions
function updateProgress(step, message) {
    currentStep = step;
    const progress = (step / 4) * 100;

    document.getElementById('progress-bar').style.width = `${progress}%`;
    document.getElementById('progress-text').textContent = message;

    // Update step indicators (only 4 steps in this flow)
    for (let i = 1; i <= 4; i++) {
        const stepElement = document.getElementById(`step-${i}`);
        if (stepElement) {
            if (i <= step) {
                stepElement.classList.remove('opacity-50');
                stepElement.innerHTML = stepElement.innerHTML.replace('⏳', '✅');
            }
        }
    }
}

function showResults(report) {
    document.getElementById('progress-section').classList.add('hidden');
    document.getElementById('results-section').classList.remove('hidden');

    // Summary cards
    const summaryCards = document.getElementById('summary-cards');
    summaryCards.innerHTML = `
        <div class="bg-blue-50 p-6 rounded-lg">
            <div class="text-2xl font-bold text-blue-600">${report.clusters.length}</div>
            <div class="text-sm text-blue-800">Keyword Clusters</div>
        </div>
        <div class="bg-green-50 p-6 rounded-lg">
            <div class="text-2xl font-bold text-green-600">${report.analysis_summary.total_monthly_search_volume.toLocaleString()}</div>
            <div class="text-sm text-green-800">Monthly Search Volume</div>
        </div>
        <div class="bg-purple-50 p-6 rounded-lg">
            <div class="text-2xl font-bold text-purple-600">${report.analysis_summary.estimated_monthly_traffic_potential.toLocaleString()}</div>
            <div class="text-sm text-purple-800">Est. Monthly Traffic</div>
        </div>
        <div class="bg-orange-50 p-6 rounded-lg">
            <div class="text-2xl font-bold text-orange-600">$${report.analysis_summary.avg_cpc.toFixed(2)}</div>
            <div class="text-sm text-orange-800">Average CPC</div>
        </div>
    `;

    // Quick wins
    const quickWinsContent = document.getElementById('quick-wins-content');
    if (report.quick_wins.length > 0) {
        quickWinsContent.innerHTML = report.quick_wins.map(cluster => `
            <div class="border border-green-200 rounded-lg p-4 mb-4">
                <h4 class="font-bold text-lg text-green-800">${cluster.main_keyword}</h4>
                <div class="grid md:grid-cols-3 gap-4 mt-2 text-sm">
                    <div>📊 ${cluster.total_search_volume.toLocaleString()} searches/month</div>
                    <div>💰 $${cluster.avg_cpc.toFixed(2)} CPC</div>
                    <div>🎯 ${Math.round(cluster.avg_difficulty)}/100 difficulty</div>
                </div>
            </div>
        `).join('');
    } else {
        quickWinsContent.innerHTML = '<p class="text-gray-600">Focus on building domain authority first to unlock quick wins.</p>';
    }

    // High value targets
    const highValueContent = document.getElementById('high-value-content');
    if (report.high_value.length > 0) {
        highValueContent.innerHTML = report.high_value.map(cluster => `
            <div class="border border-purple-200 rounded-lg p-4 mb-4">
                <h4 class="font-bold text-lg text-purple-800">${cluster.main_keyword}</h4>
                <div class="grid md:grid-cols-3 gap-4 mt-2 text-sm">
                    <div>📊 ${cluster.total_search_volume.toLocaleString()} searches/month</div>
                    <div>💰 $${cluster.avg_cpc.toFixed(2)} CPC</div>
                    <div>💎 ${cluster.total_commercial_score.toLocaleString()} commercial score</div>
                </div>
            </div>
        `).join('');
    } else {
        highValueContent.innerHTML = '<p class="text-gray-600">Build content around main clusters to develop high-value opportunities.</p>';
    }

    // Clusters
    const clustersContent = document.getElementById('clusters-content');
    clustersContent.innerHTML = report.clusters.slice(0, 5).map((cluster, index) => `
        <div class="border border-gray-200 rounded-lg p-6 mb-6">
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="text-xl font-bold text-gray-800">${index + 1}. ${cluster.main_keyword}</h4>
                    <span class="text-sm text-gray-500">${cluster.theme}</span>
                </div>
                <div class="text-right">
                    <div class="text-2xl font-bold text-blue-600">${cluster.total_search_volume.toLocaleString()}</div>
                    <div class="text-sm text-gray-500">monthly searches</div>
                </div>
            </div>

            <div class="grid md:grid-cols-3 gap-4 mb-4">
                <div class="text-center p-3 bg-gray-50 rounded">
                    <div class="font-bold text-lg">$${cluster.avg_cpc.toFixed(2)}</div>
                    <div class="text-sm text-gray-600">Avg CPC</div>
                </div>
                <div class="text-center p-3 bg-gray-50 rounded">
                    <div class="font-bold text-lg">${Math.round(cluster.avg_difficulty)}/100</div>
                    <div class="text-sm text-gray-600">Difficulty</div>
                </div>
                <div class="text-center p-3 bg-gray-50 rounded">
                    <div class="font-bold text-lg">${cluster.keywords.length}</div>
                    <div class="text-sm text-gray-600">Keywords</div>
                </div>
            </div>

            <div class="mb-4">
                <h5 class="font-semibold mb-2">Top Keywords:</h5>
                <div class="space-y-1">
                    ${cluster.keywords.slice(0, 5).map(kw => `
                        <div class="flex justify-between text-sm">
                            <span>${kw.keyword}</span>
                            <span class="text-gray-500">${kw.search_volume.toLocaleString()} searches</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            ${cluster.competitor_domains.length > 0 ? `
                <div>
                    <h5 class="font-semibold mb-2">Top Competitors:</h5>
                    <div class="text-sm text-gray-600">${cluster.competitor_domains.slice(0, 3).join(', ')}</div>
                </div>
            ` : ''}
        </div>
    `).join('');

    // Competitors
    const competitorsContent = document.getElementById('competitors-content');
    if (report.competitors.length > 0) {
        competitorsContent.innerHTML = `
            <div class="grid md:grid-cols-2 gap-4">
                ${report.competitors.map(domain => `
                    <div class="flex items-center p-3 bg-red-50 rounded-lg">
                        <div class="text-red-600 text-xl mr-3">🏆</div>
                        <span class="font-medium">${domain}</span>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        competitorsContent.innerHTML = '<p class="text-gray-600">No major competitors identified in the analyzed keywords.</p>';
    }

    // Action plan
    const actionPlanContent = document.getElementById('action-plan-content');
    actionPlanContent.innerHTML = `
        <div class="space-y-6">
            <div>
                <h4 class="font-bold text-lg text-orange-800 mb-3">🚀 Immediate Actions (1-2 weeks)</h4>
                <ul class="space-y-2">
                    <li class="flex items-start">
                        <span class="text-green-500 mr-2">✓</span>
                        <span>Target quick win keywords with low competition</span>
                    </li>
                    <li class="flex items-start">
                        <span class="text-green-500 mr-2">✓</span>
                        <span>Create targeted landing pages for main keyword clusters</span>
                    </li>
                    <li class="flex items-start">
                        <span class="text-green-500 mr-2">✓</span>
                        <span>Analyze competitor content strategies</span>
                    </li>
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-lg text-orange-800 mb-3">📈 Medium-term Goals (1-3 months)</h4>
                <ul class="space-y-2">
                    <li class="flex items-start">
                        <span class="text-blue-500 mr-2">◯</span>
                        <span>Build comprehensive content for high-value clusters</span>
                    </li>
                    <li class="flex items-start">
                        <span class="text-blue-500 mr-2">◯</span>
                        <span>Develop internal linking strategy between related keywords</span>
                    </li>
                    <li class="flex items-start">
                        <span class="text-blue-500 mr-2">◯</span>
                        <span>Start building backlinks to target pages</span>
                    </li>
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-lg text-orange-800 mb-3">🎯 Long-term Strategy (6-12 months)</h4>
                <ul class="space-y-2">
                    <li class="flex items-start">
                        <span class="text-purple-500 mr-2">◐</span>
                        <span>Build domain authority through high-quality content</span>
                    </li>
                    <li class="flex items-start">
                        <span class="text-purple-500 mr-2">◐</span>
                        <span>Target high-difficulty, high-value keywords</span>
                    </li>
                    <li class="flex items-start">
                        <span class="text-purple-500 mr-2">◐</span>
                        <span>Expand into related keyword opportunities</span>
                    </li>
                </ul>
            </div>
        </div>
    `;
}

function showError(message) {
    document.getElementById('input-form').style.display = 'block';
    document.getElementById('progress-section').classList.add('hidden');
    document.getElementById('error-section').classList.remove('hidden');
    document.getElementById('error-message').textContent = message;
}

function downloadReport() {
    if (!analysisData) return;

    const dataStr = JSON.stringify(analysisData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `keyword-research-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

console.log("app.js loaded");
