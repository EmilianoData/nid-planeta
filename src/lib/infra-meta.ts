export type InfraCategory = 'Source' | 'Ingest' | 'Fabric' | 'Process' | 'Enrich' | 'Serve';

export type InfraMeta = {
  id: string;
  category: InfraCategory;
  vendor: string;
  layer?: string;
  oneLiner: string;
  description: string;
  capabilities: string[];
  fedBy: string[];
  feeds: string[];
  delpContext?: string;
  docsUrl?: string;
};

export const INFRA_META: Record<string, InfraMeta> = {
  // ========== SOURCES ==========
  'fluig': {
    id: 'fluig',
    category: 'Source',
    vendor: 'TOTVS · Delp',
    oneLiner: 'Plataforma de processos · BPM · ECM',
    description:
      'FLUIG é a plataforma de workflow e ECM da TOTVS. Centraliza formulários, aprovações, documentos e processos administrativos da Delp. As tabelas internas viram fonte estruturada para análise de produtividade, ciclo de aprovação e compliance.',
    capabilities: [
      'Workflows e aprovações',
      'Formulários eletrônicos',
      'GED · documentos versionados',
      'Integração via REST/SOAP',
    ],
    fedBy: [],
    feeds: ['event-hubs'],
    delpContext: 'Hoje serve como fonte para fluxos de RH, Compras e Qualidade.',
  },
  'totvs': {
    id: 'totvs',
    category: 'Source',
    vendor: 'TOTVS · Delp',
    oneLiner: 'ERP corporativo · master de operações',
    description:
      'TOTVS RM (Linha Corporativa) é o ERP da Delp. Master de dados de Financeiro, Custos, Estoque, Folha, Fiscal, Manufatura. Toda tabela analítica do data lake refere-se a entidades originadas aqui.',
    capabilities: [
      'Financeiro · Custos · Fiscal',
      'Manufatura · Estoque · Compras',
      'Folha de Pagamento · RH',
      'Banco Oracle/SQL Server backing',
    ],
    fedBy: [],
    feeds: ['event-hubs', 'mirroring'],
    delpContext: 'Todas as views da camada Gold consolidam métricas com chaves do TOTVS.',
  },
  'sharepoint': {
    id: 'sharepoint',
    category: 'Source',
    vendor: 'Microsoft 365',
    oneLiner: 'Documentos · Listas · Colaboração',
    description:
      'SharePoint Online armazena documentos, listas customizadas e bibliotecas departamentais. Para o data lake, vira fonte de metadados, planilhas operacionais usadas como controle paralelo, e listas que ainda não foram migradas para sistema dedicado.',
    capabilities: [
      'Bibliotecas de documentos',
      'Listas como banco leve',
      'Permissões · Entra ID',
      'Conector Power Query nativo',
    ],
    fedBy: [],
    feeds: ['iot-hub'],
    delpContext: 'Capta planilhas de controle e listas operacionais que viram steady state via Dataflow.',
  },
  'db-local': {
    id: 'db-local',
    category: 'Source',
    vendor: 'Delp · On-prem',
    oneLiner: 'SQL Server local · sistemas legados',
    description:
      'Banco SQL Server hospedado on-premises na Delp. Concentra sistemas internos (apontamento, qualidade, manutenção) que ainda não migraram. O Mirroring no Fabric mantém réplica viva sem ETL clássico.',
    capabilities: [
      'SQL Server 2019+',
      'Acessado via ExpressRoute / VPN',
      'Replicado por Fabric Mirroring',
      'Schema relacional clássico',
    ],
    fedBy: [],
    feeds: ['mirroring'],
    delpContext: 'Fonte de apontamento de chão de fábrica e sistemas de qualidade.',
  },
  'azure-data': {
    id: 'azure-data',
    category: 'Source',
    vendor: 'Microsoft Azure',
    oneLiner: 'Serviços de dados nativos Azure',
    description:
      'Conjunto de serviços de dados gerenciados Azure: Cosmos DB para NoSQL multi-region, Dataverse para apps Power Platform, Azure SQL DB para apps web. São fontes para integração com Fabric quando os apps NID/Software produzem dados próprios.',
    capabilities: [
      'Cosmos DB · NoSQL global',
      'Dataverse · Power Platform',
      'Azure SQL DB · PaaS',
      'Mirroring nativo no Fabric',
    ],
    fedBy: [],
    feeds: ['mirroring'],
    docsUrl: 'https://learn.microsoft.com/azure/cosmos-db/',
  },

  // ========== INGEST ==========
  'event-hubs': {
    id: 'event-hubs',
    category: 'Ingest',
    vendor: 'Microsoft Azure',
    oneLiner: 'Plataforma de streaming de eventos em escala',
    description:
      'Azure Event Hubs é um ingestor distribuído de eventos. Recebe milhões de eventos por segundo de aplicações, sensores, sistemas. No nosso pipeline, captura mudanças em tempo real do FLUIG e do TOTVS via change feed.',
    capabilities: [
      'Throughput até milhões de eventos/s',
      'Retenção de 1 a 90 dias',
      'Compatível com Kafka',
      'Particionamento horizontal',
    ],
    fedBy: ['fluig', 'totvs'],
    feeds: ['eventstreams'],
    docsUrl: 'https://learn.microsoft.com/azure/event-hubs/',
  },
  'iot-hub': {
    id: 'iot-hub',
    category: 'Ingest',
    vendor: 'Microsoft Azure',
    oneLiner: 'Hub de telemetria de dispositivos · IoT',
    description:
      'Azure IoT Hub recebe telemetria de dispositivos físicos: máquinas de fábrica, sensores, balanças. Diferente do Event Hubs, suporta comunicação bidirecional (cloud-to-device) e identidade por dispositivo.',
    capabilities: [
      'Identidade e segurança por device',
      'Comunicação bidirecional',
      'Edge gateway support',
      'MQTT · AMQP · HTTPS',
    ],
    fedBy: ['sharepoint'],
    feeds: ['eventstreams'],
    docsUrl: 'https://learn.microsoft.com/azure/iot-hub/',
  },

  // ========== FABRIC INGEST ==========
  'eventstreams': {
    id: 'eventstreams',
    category: 'Fabric',
    vendor: 'Microsoft Fabric',
    layer: 'Hot Path',
    oneLiner: 'Streaming nativo Fabric · transformações no-code',
    description:
      'Eventstreams é o serviço de stream processing do Fabric. Recebe de Event Hubs, IoT Hub, Kafka, e aplica transformações em tempo real (filtro, agregação, join) antes de aterrissar no Eventhouse ou Lakehouse.',
    capabilities: [
      'Editor visual · sem código',
      'Janelas de tempo (tumbling/sliding)',
      'Roteamento condicional',
      'Latência sub-segundo',
    ],
    fedBy: ['event-hubs', 'iot-hub'],
    feeds: ['eventhouse'],
    docsUrl: 'https://learn.microsoft.com/fabric/real-time-intelligence/event-streams/overview',
  },
  'data-factory': {
    id: 'data-factory',
    category: 'Fabric',
    vendor: 'Microsoft Fabric',
    layer: 'Cold Path',
    oneLiner: 'Pipelines de dados orquestrados · batch',
    description:
      'Data Factory dentro do Fabric orquestra pipelines de batch: cópia de fontes externas, execução de notebooks, dataflows e procedures em sequência. É o caminho frio — schedule-based, latência em minutos.',
    capabilities: [
      '170+ conectores nativos',
      'Pipelines com dependências',
      'Triggers por agenda · evento',
      'Monitoramento integrado',
    ],
    fedBy: [],
    feeds: ['lakehouse'],
    docsUrl: 'https://learn.microsoft.com/fabric/data-factory/',
  },
  'mirroring': {
    id: 'mirroring',
    category: 'Fabric',
    vendor: 'Microsoft Fabric',
    layer: 'Replication',
    oneLiner: 'Réplica em tempo real do banco fonte para OneLake',
    description:
      'Fabric Mirroring mantém uma cópia viva (lag de segundos) de bancos relacionais no OneLake como tabelas Delta. Sem custo de compute para a réplica, sem ETL. Ideal para refletir DB Local Delp sem mexer no on-prem.',
    capabilities: [
      'Sub-segundo de lag',
      'Sem cobrança extra de compute',
      'Suporta SQL Server, Cosmos, Snowflake',
      'Tabelas Delta nativas no OneLake',
    ],
    fedBy: ['totvs', 'db-local', 'azure-data'],
    feeds: ['mirrored-replica'],
    docsUrl: 'https://learn.microsoft.com/fabric/database/mirrored-database/overview',
  },

  // ========== FABRIC STORAGE ==========
  'eventhouse': {
    id: 'eventhouse',
    category: 'Fabric',
    vendor: 'Microsoft Fabric',
    layer: 'Hot Storage',
    oneLiner: 'Banco KQL otimizado para tempo real',
    description:
      'Eventhouse é o equivalente Fabric do Azure Data Explorer. Banco columnar otimizado para alta cardinalidade e queries em tempo real sobre dados quentes (logs, telemetria, eventos). Acessado via KQL.',
    capabilities: [
      'Queries sub-segundo em bilhões de linhas',
      'Linguagem KQL nativa',
      'Retenção configurável por tabela',
      'OneLake-aware',
    ],
    fedBy: ['eventstreams'],
    feeds: ['kql-queryset'],
    docsUrl: 'https://learn.microsoft.com/fabric/real-time-intelligence/eventhouse',
  },
  'lakehouse': {
    id: 'lakehouse',
    category: 'Fabric',
    vendor: 'Microsoft Fabric',
    layer: 'Bronze · Silver · Gold',
    oneLiner: 'Lakehouse medallion · Delta Lake no OneLake',
    description:
      'O Lakehouse é a camada principal do nosso data lake. Organizado em medallion: Bronze (raw), Silver (limpo, conformado), Gold (modelado por domínio). Tudo em formato Delta Lake, queryable por Spark, SQL e Power BI.',
    capabilities: [
      'Tabelas Delta · ACID',
      'Time travel · versionamento',
      'Acessível por Spark, T-SQL, KQL',
      'Schema evolution',
    ],
    fedBy: ['data-factory'],
    feeds: ['spark-notebook', 'sql-scripts', 'dataflow-gen2'],
    delpContext: 'Camada Gold é o que TODOS os projetos NID consomem. É o contrato.',
    docsUrl: 'https://learn.microsoft.com/fabric/data-engineering/lakehouse-overview',
  },
  'mirrored-replica': {
    id: 'mirrored-replica',
    category: 'Fabric',
    vendor: 'Microsoft Fabric',
    layer: 'Replication',
    oneLiner: 'Tabelas Delta espelhadas dos bancos fonte',
    description:
      'A réplica gerada pelo Mirroring aparece no OneLake como tabelas Delta consultáveis. Não há cópia física dupla — o Fabric mantém indexação sobre os dados Delta resultantes. Estas tabelas alimentam Spark e SQL diretamente.',
    capabilities: [
      'Tabelas Delta read-only',
      'Schema sincronizado com fonte',
      'Queryable como Lakehouse',
      'Atualizado em near-real-time',
    ],
    fedBy: ['mirroring'],
    feeds: ['spark-notebook', 'sql-scripts'],
  },

  // ========== PROCESS ==========
  'kql-queryset': {
    id: 'kql-queryset',
    category: 'Process',
    vendor: 'Microsoft Fabric',
    oneLiner: 'Workspace de queries KQL salvas',
    description:
      'KQL Querysets são coleções de queries Kusto Query Language reutilizáveis sobre Eventhouses. Servem para análise exploratória de telemetria, dashboards de tempo real, e alertas baseados em padrões.',
    capabilities: [
      'KQL · linguagem rica para time-series',
      'Visualização inline',
      'Compartilhável entre times',
      'Origem de Real-time Dashboards',
    ],
    fedBy: ['eventhouse'],
    feeds: ['foundry'],
    docsUrl: 'https://learn.microsoft.com/fabric/real-time-intelligence/kusto-query-set',
  },
  'spark-notebook': {
    id: 'spark-notebook',
    category: 'Process',
    vendor: 'Microsoft Fabric',
    oneLiner: 'Apache Spark · transformações distribuídas',
    description:
      'Notebooks Spark no Fabric executam PySpark, Scala, SparkSQL e SparkR sobre Lakehouses. São o motor para transformações pesadas: limpeza de Bronze, conformação Silver, modelagem Gold, feature engineering para ML.',
    capabilities: [
      'PySpark · SparkSQL nativo',
      'Auto-scale de clusters',
      'Integração com MLflow',
      'Livy/REST API',
    ],
    fedBy: ['lakehouse', 'mirrored-replica'],
    feeds: ['foundry', 'azure-ml'],
    docsUrl: 'https://learn.microsoft.com/fabric/data-engineering/lakehouse-notebook-explore',
  },
  'sql-scripts': {
    id: 'sql-scripts',
    category: 'Process',
    vendor: 'Microsoft Fabric',
    oneLiner: 'T-SQL Warehouse · queries analíticas',
    description:
      'O endpoint SQL Warehouse do Fabric expõe os Lakehouses como banco T-SQL clássico. SQL Scripts servem para criar views analíticas, modelar Gold semanticamente e servir Power BI direto via DirectLake.',
    capabilities: [
      'T-SQL completo',
      'Views materializadas',
      'DirectLake para Power BI',
      'Stored procedures',
    ],
    fedBy: ['lakehouse', 'mirrored-replica'],
    feeds: ['power-bi'],
    docsUrl: 'https://learn.microsoft.com/fabric/data-warehouse/sql-query-editor',
  },
  'dataflow-gen2': {
    id: 'dataflow-gen2',
    category: 'Process',
    vendor: 'Microsoft Fabric',
    oneLiner: 'Power Query · ETL self-service',
    description:
      'Dataflow Gen2 é o Power Query do Fabric. ETL no-code/low-code com 170+ conectores. Time de negócio constrói transformações sem mexer em Spark — saída pode aterrissar em Lakehouse, Warehouse ou Power BI.',
    capabilities: [
      'Power Query M',
      '170+ conectores',
      'Visual data prep',
      'CI/CD via Git integration',
    ],
    fedBy: ['lakehouse'],
    feeds: ['power-bi'],
    docsUrl: 'https://learn.microsoft.com/fabric/data-factory/data-factory-overview#dataflow-gen2',
  },

  // ========== ENRICH ==========
  'foundry': {
    id: 'foundry',
    category: 'Enrich',
    vendor: 'Microsoft Azure',
    oneLiner: 'Plataforma de IA · LLMs · agentes',
    description:
      'Microsoft Foundry (sucessor de Azure AI Studio) é a plataforma para construir, deployar e operar soluções com LLMs e agentes. Hospeda modelos OpenAI, Llama, Phi, com governança, prompt flows e avaliação contínua.',
    capabilities: [
      'GPT-4o · Claude · Llama · Phi',
      'Prompt flows visuais',
      'Avaliação automatizada',
      'Agentes multimodais',
    ],
    fedBy: ['kql-queryset', 'spark-notebook'],
    feeds: ['data-agent'],
    delpContext: 'Será a base do agente multiagentico Delp que conversa via Teams.',
    docsUrl: 'https://learn.microsoft.com/azure/ai-foundry/',
  },
  'azure-ml': {
    id: 'azure-ml',
    category: 'Enrich',
    vendor: 'Microsoft Azure',
    oneLiner: 'Plataforma de Machine Learning · custom models',
    description:
      'Azure Machine Learning para modelos preditivos customizados: forecasting de demanda, manutenção preditiva, scoring de qualidade. Treina, registra, deploya e monitora modelos com MLOps integrado.',
    capabilities: [
      'AutoML para tabular/visão/NLP',
      'MLflow tracking',
      'Endpoints managed/serverless',
      'Pipelines reproduzíveis',
    ],
    fedBy: ['spark-notebook'],
    feeds: ['vector-store'],
    docsUrl: 'https://learn.microsoft.com/azure/machine-learning/',
  },

  // ========== SERVE ==========
  'power-bi': {
    id: 'power-bi',
    category: 'Serve',
    vendor: 'Microsoft Fabric',
    oneLiner: 'Plataforma de BI · dashboards corporativos',
    description:
      'Power BI consome do Fabric via DirectLake (sem cópia, sem import) ou via dataset semântico clássico. Entrega dashboards executivos, relatórios paginados e métricas Q&A. É o serving primário da camada BI.',
    capabilities: [
      'DirectLake · zero-cost serving',
      'Dataset semântico unificado',
      'Q&A em linguagem natural',
      'Apps mobile e embed',
    ],
    fedBy: ['sql-scripts', 'dataflow-gen2'],
    feeds: ['bi-stack'],
    docsUrl: 'https://learn.microsoft.com/power-bi/',
  },
  'data-agent': {
    id: 'data-agent',
    category: 'Serve',
    vendor: 'Microsoft Fabric',
    oneLiner: 'Agente conversacional sobre dados Fabric',
    description:
      'Fabric Data Agent é a interface conversacional sobre o data estate. Combinado com Foundry, vira o backend do chat no Teams: usuário pergunta em linguagem natural, agente traduz para KQL/SQL/Spark, executa, retorna em prosa.',
    capabilities: [
      'NLP-to-query (KQL · T-SQL · Spark)',
      'Grounded em metadados Purview',
      'Skill discovery automática',
      'Integrável a Teams · Copilot',
    ],
    fedBy: ['foundry'],
    feeds: ['ia-stack'],
  },
  'vector-store': {
    id: 'vector-store',
    category: 'Serve',
    vendor: 'Microsoft Azure',
    oneLiner: 'Banco vetorial · RAG · embeddings',
    description:
      'Vector Store (Azure AI Search com vetores ou Cosmos DB Mongo vCore) armazena embeddings para padrões RAG. Documentos da Delp são chunked, embedded e indexados — qualquer agente IA recupera contexto semântico relevante.',
    capabilities: [
      'Busca híbrida (vetor + texto)',
      'Embeddings OpenAI · BGE',
      'Reranking semântico',
      'Filtros por metadado',
    ],
    fedBy: ['azure-ml'],
    feeds: ['sw-stack'],
    docsUrl: 'https://learn.microsoft.com/azure/search/vector-search-overview',
  },
  'external-share': {
    id: 'external-share',
    category: 'Serve',
    vendor: 'Microsoft Fabric',
    oneLiner: 'Compartilhamento curado para sistemas externos',
    description:
      'External Share via OneLake Shortcuts ou Fabric APIs entrega datasets curados (Gold) para sistemas externos: integrações RPA, exports operacionais, integrações com parceiros. Ponto de saída do data lake para o mundo.',
    capabilities: [
      'OneLake Shortcuts',
      'API REST nativa',
      'Permissões granular Entra ID',
      'Auditoria via Purview',
    ],
    fedBy: ['dataflow-gen2'],
    feeds: ['rpa-stack', 'gen-stack'],
  },
};

export function getInfraMeta(id: string): InfraMeta | undefined {
  return INFRA_META[id];
}
