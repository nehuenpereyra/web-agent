# Web-Agent
This project implements an AI agent capable of collecting information from websites, building a vectorized knowledge base, and leveraging that data to enhance a large language model through a retrieval-augmented generation (RAG) workflow.

*"Currently, the example environment variables and the prompt assigned to the Astronomer Agent are configured to retrieve information from [https://ialp.fcaglp.unlp.edu.ar](https://ialp.fcaglp.unlp.edu.ar). This allows the agent to respond to queries based on the content available on that website."*



## Key Features

- Web scraping capabilities for linguistic data collection
- Text processing and smart text splitting
- RAG-based information retrieval
- Agent-based workflows for automated linguistic analysis
- Integration with Ollama for local LLM support

## Technologies

- **Framework**: Mastra.js for agent orchestration
- **Language**: TypeScript/Node.js (requires Node.js ≥ 20.9.0)
- **Database**: PostgreSQL for data storage
- **LLM Integration**: Ollama for local model deployment
- **Web Scraping**: Puppeteer and Cheerio
- **Text Processing**: HTML-to-text, PDF parsing

## Project Structure

- `src/config/`: Configuration files for environment, logging, and Ollama
- `src/ingest/`: Data ingestion processes
- `src/mastra/`: Agent definitions, tools, and workflows
- `src/rag/`: Retrieval-Augmented Generation components
- `src/scraping/`: Web scraping functionality
- `src/utils/`: Utility functions for text processing and data handling


## Getting Started

### Prerequisites

- Node.js (version 20.9.0 or higher)
- PNPM package manager
- PostgreSQL
- Ollama (for local LLM support)



### Installation

1. Clone the repository:

   ```bash
   git clone [repository-url]
   cd ialp-agent
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the PostgreSQL database using Docker (optional):

   ```bash
   docker run -d \
   --name postgres-vector \
   -e POSTGRES_DB=vector_db \
   -e POSTGRES_USER=postgres  \
   -e POSTGRES_PASSWORD=postgres \
   -e POSTGRES_HOST_AUTH_METHOD=trust \
   -p 5433:5432 \
   pgvector/pgvector:pg16
   ```

4. Set up environment variables:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file with your configuration settings.

5. Set up Ollama (if using local models):
   ```bash
   pnpm setup:ollama
   ```

### Usage

#### Development

Run the development server:

```bash
pnpm dev
```

#### Building for Production

Build the project:

```bash
pnpm build
```

Start the production server:

```bash
pnpm start
```

#### Data Ingestion

Process and ingest data:

```bash
pnpm ingest
```

#### Web Scraping

Save HTML content:

```bash
pnpm save:html
```

Save extracted text:

```bash
pnpm save:text
```


## License

MIT
