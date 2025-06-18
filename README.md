# SEO Keyword Research Tool

A complete web application that provides comprehensive keyword research and analysis using AI and professional SEO APIs.

## Features

🔍 **Comprehensive Analysis**
- AI-powered keyword generation from any topic
- Search volume and competition data
- Competitor SERP analysis
- Smart keyword clustering
- Related keyword discovery

📊 **Detailed Reports**
- Top 10 keyword clusters with metrics
- Quick wins (low competition opportunities)
- High-value targets (commercial keywords)
- Competitor analysis
- Actionable SEO strategy

🎯 **Business-Focused**
- Works with any keyword topic or niche
- Commercial intent scoring
- Industry-specific keyword suggestions
- Tailored action plans

## Setup Instructions

### 1. API Keys Required

You'll need accounts and API keys from these services:

**Perplexity** (AI Keyword Generation)
- Sign up at: https://www.perplexity.ai/
- Get your API key from settings
- Format: `pplx-xxxxxxxxxx`

**DataForSEO** (Keyword & SERP Data)
- Sign up at: https://dataforseo.com/
- Get your email and password credentials
- Note: This uses your login credentials (email/password)

### 2. Installation

1. **Download the files**
   ```bash
   # All files should be in the same folder:
   # - index.html
   # - app.js
   # - README.md
   ```

2. **Start local server**
   ```bash
   # Navigate to the project folder and run:
   python3 -m http.server 8000

   # Then open: http://localhost:8000
   ```

### 3. Using the Tool

1. **Enter Keyword Topic**
   - Input any topic, niche, or business area you want to research
   - Examples: "AI order entry software", "sustainable fashion", "dog training"

2. **Select Business Type**
   - Choose from: E-commerce, SaaS, Service Business, Blog/Content, Education

3. **Add API Keys**
   - Perplexity API Key
   - DataForSEO Email & Password

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
- Grouped related keywords by theme and intent
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

- **Perplexity**: ~$0.02 per keyword generation request
- **DataForSEO**: ~$0.50-1.00 per analysis (varies by keyword count)

**Total per analysis: ~$0.52-1.02**

## Technical Details

### Browser Compatibility
- Modern browsers with JavaScript enabled
- Chrome, Firefox, Safari, Edge
- Mobile responsive design

### Security
- API keys are only stored in browser localStorage
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
- Verify you have API credits available
- Try with a different keyword topic

**Perplexity API errors:**
- Confirm API key format is correct (`pplx-...`)
- Check account has sufficient credits
- Verify API key permissions

**DataForSEO errors:**
- Confirm email/password are correct
- Check account has sufficient credits
- Some keywords may have no data available

### Getting Help

1. **Check API documentation:**
   - Perplexity: https://docs.perplexity.ai/
   - DataForSEO: https://docs.dataforseo.com/

2. **Verify API keys are working:**
   - Test each API independently
   - Check credit balances
   - Confirm permissions

## Example Use Cases

- **E-commerce**: Research product categories, competitor analysis
- **SaaS**: Find software comparison keywords, feature-based searches
- **Services**: Local service keywords, industry-specific terms
- **Content**: Blog topic research, trending keywords
- **Affiliate**: Product review keywords, buying intent terms

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

**Built for marketers who want professional keyword research for any topic without the complexity of enterprise tools.**