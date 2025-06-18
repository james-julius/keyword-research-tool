# SEO Keyword Research Tool

A complete web application that provides comprehensive keyword research and analysis using AI and professional SEO APIs.

## Features

🔍 **Comprehensive Analysis**
- Website content crawling and analysis
- AI-powered seed keyword generation
- Search volume and competition data
- Competitor SERP analysis
- Smart keyword clustering

📊 **Detailed Reports**
- Top 10 keyword clusters with metrics
- Quick wins (low competition opportunities)
- High-value targets (commercial keywords)
- Competitor analysis
- Actionable SEO strategy

🎯 **Business-Focused**
- Auto-detects business type
- Commercial intent scoring
- Industry-specific keyword suggestions
- Tailored action plans

## Setup Instructions

### 1. API Keys Required

You'll need accounts and API keys from these services:

**Firecrawl** (Website Scraping)
- Sign up at: https://firecrawl.dev/
- Get your API key from the dashboard
- Format: `fc-xxxxxxxxxx`

**Perplexity** (AI Keyword Generation)
- Sign up at: https://www.perplexity.ai/
- Get your API key from settings
- Format: `pplx-xxxxxxxxxx`

**DataForSEO** (Keyword & SERP Data)
- Sign up at: https://dataforseo.com/
- Get your username and password
- Note: This uses your login credentials, not an API key

### 2. Installation

1. **Download the files**
   ```bash
   # All files should be in the same folder:
   # - index.html
   # - app.js
   # - README.md
   ```

2. **Open the application**
   - Double-click `index.html` to open in your browser
   - Or serve it locally with a web server

### 3. Using the Tool

1. **Enter Website URL**
   - Input the website you want to analyze
   - Examples: `https://example.com` or `example.com`

2. **Select Business Type**
   - Choose from: E-commerce, SaaS, Service Business, Blog/Content, Education

3. **Add API Keys**
   - Firecrawl API Key
   - Perplexity API Key  
   - DataForSEO Username & Password

4. **Start Analysis**
   - Click "Start Keyword Analysis"
   - Wait 2-3 minutes for complete analysis

5. **Review Results**
   - Summary metrics
   - Quick wins and high-value targets
   - Detailed keyword clusters
   - Competitor analysis
   - Action plan

6. **Download Report**
   - Click "Download Full Report" for JSON data

## What You Get

### Summary Metrics
- Total keyword clusters identified
- Monthly search volume potential
- Estimated traffic opportunity
- Average cost-per-click

### Quick Wins
- Low competition keywords you can rank for quickly
- Search volumes and difficulty scores
- Immediate targeting opportunities

### High-Value Targets
- Keywords with high commercial value
- Best revenue potential
- Strategic long-term targets

### Keyword Clusters
- Grouped related keywords
- Search volumes and competition data
- Top competing domains
- Content suggestions

### Competitor Analysis
- Main competing websites
- Domain overlap analysis
- Market insights

### Action Plan
- Immediate actions (1-2 weeks)
- Medium-term goals (1-3 months)
- Long-term strategy (6-12 months)

## API Costs

**Estimated costs per analysis:**

- **Firecrawl**: ~$0.01 per website scrape
- **Perplexity**: ~$0.02 per keyword generation
- **DataForSEO**: ~$0.50-1.00 per analysis (varies by keyword count)

**Total per analysis: ~$0.53-1.03**

## Technical Details

### Browser Compatibility
- Modern browsers with JavaScript enabled
- Chrome, Firefox, Safari, Edge
- Mobile responsive design

### Security
- API keys are only stored in browser memory
- No server-side storage of credentials
- HTTPS recommended for production use

### Performance
- Parallel API calls for faster processing
- Progress indicators for user feedback
- Error handling with helpful messages

## Troubleshooting

### Common Issues

**"Analysis failed" errors:**
- Check that all API keys are correct
- Verify website URL is accessible
- Ensure you have API credits available

**"Failed to scrape website":**
- Check if website blocks crawlers
- Try with a simpler website URL
- Verify Firecrawl API key is valid

**DataForSEO errors:**
- Confirm username/password are correct
- Check account has sufficient credits
- Some keywords may have no data available

### Getting Help

1. **Check API documentation:**
   - Firecrawl: https://docs.firecrawl.dev/
   - Perplexity: https://docs.perplexity.ai/
   - DataForSEO: https://docs.dataforseo.com/

2. **Verify API keys are working:**
   - Test each API independently
   - Check credit balances
   - Confirm permissions

## Customization

The tool can be customized by modifying:

- **Business types** in the dropdown
- **Location targeting** (currently US-focused)
- **Keyword limits** for API efficiency
- **Clustering algorithms** for grouping
- **Report formatting** and content

## License

This tool is provided as-is for educational and commercial use. Please ensure you comply with all API terms of service for the integrated services.

---

**Built for marketers who want professional keyword research without the complexity of enterprise tools.**