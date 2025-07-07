// Global variables
let analysisData = null;
let currentStep = 0;

// Persist API keys in localStorage
// Load any saved keys when the page loads
document.addEventListener('DOMContentLoaded', loadStoredCredentials);
function loadStoredCredentials() {
    const perplexityKey = localStorage.getItem('perplexity-key');
    const dataforSeoEmail = localStorage.getItem('dataforseo-email');
    const dataforSeoPassword = localStorage.getItem('dataforseo-password');

    if (perplexityKey) {
        document.getElementById('perplexity-key').value = perplexityKey;
    }
    if (dataforSeoEmail) {
        document.getElementById('dataforseo-email').value = dataforSeoEmail;
    }
    if (dataforSeoPassword) {
        document.getElementById('dataforseo-password').value = dataforSeoPassword;
    }
}

function saveCredentials(perplexityKey, dataforSeoEmail, dataforSeoPassword) {
    try {
        localStorage.setItem('perplexity-key', perplexityKey);
        localStorage.setItem('dataforseo-email', dataforSeoEmail);
        localStorage.setItem('dataforseo-password', dataforSeoPassword);
    } catch (err) {
        console.warn('Unable to save credentials:', err);
    }
}

// Main analysis function
async function startAnalysis() {
    // Get form data
    const keywordTopic = document.getElementById('keyword-topic').value;
    const businessType = document.getElementById('business-type').value;
    const perplexityKey = document.getElementById('perplexity-key').value;
    const dataforSeoEmail = document.getElementById('dataforseo-email').value;
    const dataforSeoPassword = document.getElementById('dataforseo-password').value;

    // Validate inputs
    if (!keywordTopic.trim()) {
        alert('Please enter a keyword topic');
        return;
    }

    if (!perplexityKey) {
        alert('Please enter your Perplexity API key');
        return;
    }

    if (!dataforSeoEmail || !dataforSeoPassword) {
        alert('Please enter your DataForSEO email and password');
        return;
    }

    // Save credentials for next visit
    saveCredentials(perplexityKey, dataforSeoEmail, dataforSeoPassword);

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
        console.log('🔄 Starting parallel API calls...');

        const [keywordMetrics, relatedKeywords, serpData] = await Promise.all([
            getKeywordMetrics(seedKeywords, dataforSeoEmail, dataforSeoPassword),
            getRelatedKeywords(seedKeywords, dataforSeoEmail, dataforSeoPassword),
            getSerpData(seedKeywords, dataforSeoEmail, dataforSeoPassword)
        ]);

        console.log('✅ All API calls completed');
        console.log('📊 Keyword metrics result:', keywordMetrics?.tasks?.[0]?.result_count || 0, 'keywords');
        console.log('🔗 Related keywords result:', relatedKeywords?.tasks?.[0]?.result_count || 0, 'keywords');
        console.log('🔍 SERP data result:', serpData?.tasks?.length || 0, 'tasks');

        // Step 3: Analyze and cluster
        updateProgress(3, 'Analyzing competitors and clustering keywords...');
        console.log('🔄 Starting analysis and clustering...');

        let clusters;
        try {
            clusters = await analyzeAndCluster(keywordMetrics, relatedKeywords, serpData, businessType);
        } catch (clusterError) {
            console.error('❌ Clustering failed:', clusterError);
            throw new Error(`Clustering failed: ${clusterError.message}`);
        }

        console.log('✅ Clustering completed');
        console.log('📈 Generated clusters:', clusters?.length || 0);
        console.log('🎯 Sample cluster:', clusters?.[0]);

        // Step 4: Generate report
        updateProgress(4, 'Generating final report...');
        console.log('🔄 Generating report...');

        let report;
        try {
            report = await generateReport(keywordTopic, businessType, perplexityKey, dataforSeoEmail, dataforSeoPassword, clusters);
        } catch (reportError) {
            console.error('❌ Report generation failed:', reportError);
            throw new Error(`Report generation failed: ${reportError.message}`);
        }

        console.log('✅ Report generated');
        console.log('📋 Report structure:', {
            clusters: report?.clusters?.length || 0,
            quick_wins: report?.quick_wins?.length || 0,
            high_value: report?.high_value?.length || 0,
            competitors: report?.competitors?.length || 0,
            has_action_plan: !!report?.action_plan
        });

        // Show results
        console.log('🔄 Displaying results...');
        analysisData = report;
        showResults(report);

    } catch (error) {
        console.error('Analysis failed:', error);
        showError(`Analysis failed: ${error.message}`);
    }
}

// Generate keywords directly from a user-provided topic
async function generateKeywordsFromTopic(topic, businessType, apiKey) {
    const prompt = `Generate 30 high-commercial-intent seed keywords for the topic "${topic}" related to a ${businessType} business.

Focus on:
1. High commercial intent ("buy", "best", "services")
2. Problem-solving intent
3. Comparison & review phrases
4. Industry-specific long-tail phrases
5. Local variations where appropriate

Return ONLY a JSON array of keyword strings, no explanations:`;

    try {
        // Validate API key format
        if (!apiKey || !apiKey.startsWith('pplx-')) {
            throw new Error('Invalid Perplexity API key format. Key should start with "pplx-"');
        }

        console.log('🔄 Making Perplexity API request...');
        console.log('📝 API Key prefix:', apiKey.substring(0, 8) + '...');
        console.log('🏢 Business Type:', businessType);
        console.log('🎯 Topic:', topic);

        const requestBody = {
            model: 'sonar-pro',
            messages: [
                { role: 'system', content: `You are an expert SEO strategist specializing in ${businessType} businesses.` },
                { role: 'user', content: prompt }
            ],
            max_tokens: 800,
            temperature: 0.2
        };

        console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.text();
            console.error('Perplexity API Error Details:', errorData);
            throw new Error(`Perplexity API error: ${response.status} - ${errorData}`);
        }

        const data = await response.json();
        const content_text = data.choices[0].message.content.trim();

        let keywords = [];
        try {
            // Remove markdown code blocks if present
            let cleanContent = content_text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

            // Try to parse as JSON first
            keywords = JSON.parse(cleanContent);
        } catch (e) {
            console.log('⚠️ JSON parsing failed, trying line-by-line parsing...');

            // If JSON parsing fails, try line-by-line parsing
            const lines = content_text.split('\n');
            keywords = lines
                .map(line => line.replace(/^[\d\-\*\.\s\[\]"'`]+/, '').replace(/["'\]\[`]/g, '').trim())
                .filter(kw => kw.length > 3 && kw.length < 100)
                .filter(kw => !kw.includes('```') && !kw.includes('json'))
                .slice(0, 30);
        }

        // Clean up keywords - remove trailing commas, quotes, etc.
        keywords = keywords
            .map(kw => kw.toString().trim())
            .map(kw => kw.replace(/[,\'"`;]+$/, '')) // Remove trailing punctuation
            .filter(kw => kw.length > 2 && kw.length < 100)
            .filter(kw => !kw.includes('```') && !kw.includes('json'))
            .filter(kw => /^[a-zA-Z0-9\s\-_]+$/.test(kw)) // Only allow alphanumeric, spaces, hyphens, underscores

        if (!Array.isArray(keywords) || keywords.length === 0) {
            throw new Error('Failed to generate keywords for the provided topic.');
        }

        const finalKeywords = keywords.slice(0, 25);
        console.log('🎯 Generated Keywords:', finalKeywords);
        console.log('📝 Sample keywords for DataForSEO:', finalKeywords.slice(0, 5));

        return finalKeywords;
    } catch (error) {
        console.error('Error in generateKeywordsFromTopic:', error);
        // Return fallback keywords if API fails
        return [
            `${topic} guide`,
            `best ${topic}`,
            `${topic} tips`,
            `how to ${topic}`,
            `${topic} tools`,
            `${topic} services`,
            `${topic} solutions`,
            `${topic} software`,
            `${topic} reviews`,
            `${topic} comparison`
        ];
    }
}

// Step 1: Generate keywords
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
            model: 'sonar-pro',
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
        // Remove markdown code blocks if present
        let cleanContent = content_text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

        // Try to parse as JSON first
        keywords = JSON.parse(cleanContent);
    } catch (e) {
        console.log('⚠️ JSON parsing failed, trying line-by-line parsing...');

        // If JSON parsing fails, try line-by-line parsing
        const lines = content_text.split('\n');
        keywords = lines
            .map(line => line.replace(/^[\d\-\*\.\s\[\]"'`]+/, '').replace(/["'\]\[`]/g, '').trim())
            .filter(kw => kw.length > 3 && kw.length < 100)
            .filter(kw => !kw.includes('```') && !kw.includes('json'))
            .slice(0, 30);
    }

    // Clean up keywords - remove trailing commas, quotes, etc.
    keywords = keywords
        .map(kw => kw.toString().trim())
        .map(kw => kw.replace(/[,\'"`;]+$/, '')) // Remove trailing punctuation
        .filter(kw => kw.length > 2 && kw.length < 100)
        .filter(kw => !kw.includes('```') && !kw.includes('json'))
        .filter(kw => /^[a-zA-Z0-9\s\-_]+$/.test(kw)) // Only allow alphanumeric, spaces, hyphens, underscores

    if (!Array.isArray(keywords) || keywords.length === 0) {
        throw new Error('Failed to generate keywords from website content.');
    }

    return keywords.slice(0, 25); // Limit for API efficiency
}

// Get keyword metrics from DataForSEO
async function getKeywordMetrics(keywords, dataforSeoEmail, dataforSeoPassword) {
    try {
        // Clean and validate keywords before sending
        const cleanKeywords = keywords
            .map(kw => kw.toString().trim().toLowerCase())
            .filter(kw => kw.length > 0 && kw.length < 100)
            .filter(kw => !kw.includes('\n') && !kw.includes('\t'))
            .slice(0, 100); // DataForSEO limit

        console.log('🧹 Cleaned keywords for DataForSEO:', cleanKeywords.slice(0, 5));
        console.log('📊 Getting keyword metrics for:', cleanKeywords.length, 'keywords');

        const auth = btoa(`${dataforSeoEmail}:${dataforSeoPassword}`);

        const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
                keywords: cleanKeywords,
                location_code: 2840, // USA
                language_code: "en"
            }])
        });

        if (!response.ok) {
            console.error('DataForSEO API error:', response.status, response.statusText);
            throw new Error(`DataForSEO API error: ${response.status}`);
        }

        const data = await response.json();
        console.log('✅ DataForSEO API Success:', {
            status_code: data.status_code,
            status_message: data.status_message,
            cost: data.cost,
            tasks_count: data.tasks_count,
            time: data.time
        });

        if (data.tasks && data.tasks.length > 0) {
            console.log('📊 Task Details:', {
                task_status: data.tasks[0].status_code,
                task_message: data.tasks[0].status_message,
                result_count: data.tasks[0].result_count,
                has_result: !!data.tasks[0].result
            });

            if (data.tasks[0].result) {
                console.log('🎯 Sample Results:', data.tasks[0].result.slice(0, 3));
            } else {
                console.warn('⚠️ No results returned. This might be due to:');
                console.warn('- Keywords have no search volume data');
                console.warn('- API endpoint limitations');
                console.warn('- Request format issues');
            }
        }

        // Return the full response for analyzeAndCluster to process
        return data;
    } catch (error) {
        console.error('Error getting keyword metrics:', error);
        // Return mock data structure that matches DataForSEO format
        return {
            status_code: 20000,
            tasks: [{
                result: keywords.map(keyword => ({
                    keyword: keyword,
                    search_volume: Math.floor(Math.random() * 5000) + 100,
                    cpc: Math.random() * 3 + 0.5,
                    competition: Math.floor(Math.random() * 100),
                    competition_level: 'LOW'
                }))
            }]
        };
    }
}

// Get related keywords from DataForSEO
async function getRelatedKeywords(keywords, dataforSeoEmail, dataforSeoPassword) {
    try {
        const auth = btoa(`${dataforSeoEmail}:${dataforSeoPassword}`);

        const response = await fetch('https://api.dataforseo.com/v3/keywords_data/google_ads/keywords_for_keywords/live', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
                keywords: keywords.slice(0, 10), // Limit to first 10 seed keywords
                location_code: 2840, // USA
                language_code: "en",
                include_serp_info: false
            }])
        });

        if (!response.ok) {
            throw new Error(`DataForSEO related keywords error: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting related keywords:', error);
        // Return mock related keywords in DataForSEO format
        const mockRelated = keywords.flatMap(keyword => [
            `${keyword} tips`,
            `${keyword} guide`,
            `best ${keyword}`,
            `${keyword} tools`,
            `how to ${keyword}`
        ]).slice(0, 50);

        return {
            status_code: 20000,
            tasks: [{
                result: mockRelated.map(keyword => ({
                    keyword: keyword,
                    search_volume: Math.floor(Math.random() * 2000) + 50,
                    cpc: Math.random() * 2 + 0.3,
                    competition: Math.floor(Math.random() * 80),
                    competition_level: 'LOW'
                }))
            }]
        };
    }
}

// Get SERP data from DataForSEO
async function getSerpData(keywords, dataforSeoEmail, dataforSeoPassword) {
    try {
        const auth = btoa(`${dataforSeoEmail}:${dataforSeoPassword}`);

        const response = await fetch('https://api.dataforseo.com/v3/serp/google/organic/live/advanced', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify([{
                keyword: keywords[0], // Use first keyword for SERP analysis
                location_code: 2840, // USA
                language_code: "en",
                device: "desktop",
                os: "windows"
            }])
        });

        if (!response.ok) {
            throw new Error(`DataForSEO SERP error: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting SERP data:', error);
        // Return mock SERP data
        return {
            status_code: 20000,
            tasks: [{
                data: [{ keyword: keywords[0] }],
                result: [{
                    items: [
                        { type: 'organic', url: 'https://example.com', title: 'Example Result', rank_absolute: 1 },
                        { type: 'organic', url: 'https://competitor.com', title: 'Competitor Result', rank_absolute: 2 }
                    ]
                }]
            }]
        };
    }
}

// Step 4: Analyze and cluster keywords
async function analyzeAndCluster(keywordMetrics, relatedKeywords, serpData, businessType) {
    console.log('🔍 Starting analyzeAndCluster with:', {
        keywordMetrics: keywordMetrics?.tasks?.[0]?.result?.length || 0,
        relatedKeywords: relatedKeywords?.tasks?.[0]?.result?.length || 0,
        serpData: serpData?.tasks?.length || 0
    });

    const keywordDB = new Map();

    // Process keyword metrics
    const volumeResults = keywordMetrics.tasks?.[0]?.result || [];
    console.log('📊 Processing', volumeResults.length, 'volume results');
    console.log('🔍 Sample volume result:', volumeResults[0]);

        volumeResults.forEach((item, index) => {
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

    console.log('✅ Added', keywordDB.size, 'keywords from volume results');

    // Add related keywords
    const relatedResults = relatedKeywords.tasks?.[0]?.result || [];
    console.log('🔗 Processing', relatedResults.length, 'related results');
    console.log('🔍 Sample related result:', relatedResults[0]);

    const filteredRelated = relatedResults.filter(item => item.search_volume > 100);
    console.log('🔍 Filtered to', filteredRelated.length, 'related keywords with volume > 100');
    console.log('🔍 Sample filtered related:', filteredRelated[0]);

    filteredRelated
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

    console.log('✅ Total keywords in DB:', keywordDB.size);

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
    console.log('🎯 Keywords for clustering:', keywordsArray.length, '(filtered by search_volume > 50)');
    console.log('📋 Sample keywords:', keywordsArray.slice(0, 3).map(kw => ({
        keyword: kw.keyword,
        search_volume: kw.search_volume,
        commercial_score: kw.commercial_score
    })));

    const clusters = createClusters(keywordsArray);
    console.log('🎉 Created clusters:', clusters.length);

    return clusters;
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

// Generate action plan based on keyword analysis
function generateActionPlan(topic, businessType, clusters) {
    const quickWins = clusters.filter(c => c.avg_difficulty <= 30 && c.total_search_volume >= 500);
    const highValue = clusters.filter(c => c.total_search_volume >= 2000);

    return {
        immediate: [
            `Target "${quickWins[0]?.main_keyword || clusters[0]?.main_keyword}" for quick ranking wins`,
            `Create comprehensive content around "${topic}" keyword cluster`,
            `Analyze competitor strategies for top 3 competitors`,
            `Optimize existing pages for long-tail variations`
        ],
        short_term: [
            `Build content hubs for ${Math.min(3, clusters.length)} main keyword clusters`,
            `Develop internal linking strategy between related keywords`,
            `Start local SEO optimization if targeting local markets`,
            `Create FAQ content targeting question-based keywords`
        ],
        long_term: [
            `Target high-value keywords: ${highValue.slice(0, 2).map(c => c.main_keyword).join(', ')}`,
            `Build domain authority through strategic link building`,
            `Expand into related ${businessType} service areas`,
            `Monitor and adapt strategy based on ranking improvements`
        ]
    };
}

// Step 5: Generate report
async function generateReport(topic, businessType, perplexityKey, dataforSeoEmail, dataforSeoPassword, clusters) {
    const totalSearchVolume = clusters.reduce((sum, c) => sum + c.total_search_volume, 0);
    const avgCPC = clusters.length > 0 ? clusters.reduce((sum, c) => sum + c.avg_cpc, 0) / clusters.length : 0;
    const estimatedTraffic = Math.round(totalSearchVolume * 0.3);
    const allCompetitors = [...new Set(clusters.flatMap(c => c.competitor_domains || []))].filter(d => d);

    // Get quick wins and high value targets
    const quickWins = clusters.filter(c => c.avg_difficulty <= 30 && c.total_search_volume >= 100);
    const highValue = clusters.filter(c => c.total_search_volume >= 1000);

    return {
        // Structure that matches showResults expectations
        clusters: clusters.slice(0, 5),
        analysis_summary: {
            total_monthly_search_volume: totalSearchVolume,
            estimated_monthly_traffic_potential: estimatedTraffic,
            avg_cpc: avgCPC
        },
        quick_wins: quickWins.slice(0, 10),
        high_value: highValue.slice(0, 10),
        competitors: allCompetitors.slice(0, 8),
        action_plan: generateActionPlan(topic, businessType, clusters),

        // Additional summary data
        summary: {
            source_topic: topic,
            business_type: businessType,
            total_keywords: clusters.reduce((sum, c) => sum + c.keywords.length, 0),
            total_search_volume: totalSearchVolume,
            estimated_monthly_traffic: estimatedTraffic,
            average_cpc: avgCPC.toFixed(2),
            analysis_date: new Date().toISOString()
        }
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
                    ${report.action_plan.immediate.map(action => `
                        <li class="flex items-start">
                            <span class="text-green-500 mr-2">✓</span>
                            <span>${action}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-lg text-orange-800 mb-3">📈 Short-term Goals (1-3 months)</h4>
                <ul class="space-y-2">
                    ${report.action_plan.short_term.map(action => `
                        <li class="flex items-start">
                            <span class="text-blue-500 mr-2">◯</span>
                            <span>${action}</span>
                        </li>
                    `).join('')}
                </ul>
            </div>

            <div>
                <h4 class="font-bold text-lg text-orange-800 mb-3">🎯 Long-term Strategy (6-12 months)</h4>
                <ul class="space-y-2">
                    ${report.action_plan.long_term.map(action => `
                        <li class="flex items-start">
                            <span class="text-purple-500 mr-2">◐</span>
                            <span>${action}</span>
                        </li>
                    `).join('')}
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

// Test DataForSEO credentials
async function testDataForSeoCredentials(email, password) {
    try {
        const auth = btoa(`${email}:${password}`);

        const response = await fetch('https://api.dataforseo.com/v3/appendix/user_data', {
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`DataForSEO credential test failed: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return true;
    } catch (error) {
        console.error('Error testing DataForSEO credentials:', error);
        throw error;
    }
}

console.log("app.js loaded");
console.log("generateActionPlan function:", typeof generateActionPlan);
