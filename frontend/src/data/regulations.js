/**
 * regulations.js
 * Static regulation map: Industry × Country → Compliance Rules
 * Uses curated source-backed rule packs for hackathon demo scans.
 */

export const INDUSTRIES = [
  {
    id: 'banking',
    label: 'Banking & FinTech',
    icon: '🏦',
    description: 'KYC, AML, open banking, payment card security standards',
    color: '#58A6FF',
    gradient: 'linear-gradient(135deg, #1a3a5c, #0d1117)',
    borderColor: 'rgba(88, 166, 255, 0.4)',
  },
  {
    id: 'entertainment',
    label: 'Entertainment & Media',
    icon: '🎬',
    description: 'Age verification, content licensing, user consent, IP rights',
    color: '#BC8CFF',
    gradient: 'linear-gradient(135deg, #2e1a5c, #0d1117)',
    borderColor: 'rgba(188, 140, 255, 0.4)',
  },
  {
    id: 'shipping',
    label: 'Shipping & Logistics',
    icon: '🚢',
    description: 'Cross-border data transfer, customs compliance, cargo security',
    color: '#3FB950',
    gradient: 'linear-gradient(135deg, #1a3d24, #0d1117)',
    borderColor: 'rgba(63, 185, 80, 0.4)',
  },
];

export const CONTINENTS = [
  { id: 'europe', label: 'Europe', flag: '🇪🇺' },
  { id: 'africa', label: 'Africa', flag: '🌍' },
  { id: 'americas', label: 'Americas', flag: '🌎' },
  { id: 'asia', label: 'Asia-Pacific', flag: '🌏' },
  { id: 'middle_east', label: 'Middle East', flag: '🕌' },
];

export const COUNTRIES_BY_CONTINENT = {
  europe: [
    { id: 'de', label: 'Germany', flag: '🇩🇪' },
    { id: 'fr', label: 'France', flag: '🇫🇷' },
    { id: 'gb', label: 'United Kingdom', flag: '🇬🇧' },
    { id: 'nl', label: 'Netherlands', flag: '🇳🇱' },
    { id: 'se', label: 'Sweden', flag: '🇸🇪' },
  ],
  africa: [
    { id: 'ng', label: 'Nigeria', flag: '🇳🇬' },
    { id: 'za', label: 'South Africa', flag: '🇿🇦' },
    { id: 'ke', label: 'Kenya', flag: '🇰🇪' },
    { id: 'gh', label: 'Ghana', flag: '🇬🇭' },
    { id: 'eg', label: 'Egypt', flag: '🇪🇬' },
  ],
  americas: [
    { id: 'us', label: 'United States', flag: '🇺🇸' },
    { id: 'ca', label: 'Canada', flag: '🇨🇦' },
    { id: 'br', label: 'Brazil', flag: '🇧🇷' },
    { id: 'mx', label: 'Mexico', flag: '🇲🇽' },
    { id: 'co', label: 'Colombia', flag: '🇨🇴' },
  ],
  asia: [
    { id: 'sg', label: 'Singapore', flag: '🇸🇬' },
    { id: 'jp', label: 'Japan', flag: '🇯🇵' },
    { id: 'au', label: 'Australia', flag: '🇦🇺' },
    { id: 'in', label: 'India', flag: '🇮🇳' },
    { id: 'kr', label: 'South Korea', flag: '🇰🇷' },
  ],
  middle_east: [
    { id: 'ae', label: 'UAE', flag: '🇦🇪' },
    { id: 'sa', label: 'Saudi Arabia', flag: '🇸🇦' },
    { id: 'il', label: 'Israel', flag: '🇮🇱' },
    { id: 'qa', label: 'Qatar', flag: '🇶🇦' },
    { id: 'kw', label: 'Kuwait', flag: '🇰🇼' },
  ],
};

const SOURCE_METADATA_BY_COUNTRY = {
  de: { sourceUrl: 'https://www.bafin.de/EN/Homepage/homepage_node.html', lastUpdated: '2026-07-07' },
  fr: { sourceUrl: 'https://www.cnil.fr/en', lastUpdated: '2026-07-07' },
  gb: { sourceUrl: 'https://www.gov.uk/government/organisations/financial-conduct-authority', lastUpdated: '2026-07-07' },
  nl: { sourceUrl: 'https://www.autoriteitpersoonsgegevens.nl/en', lastUpdated: '2026-07-07' },
  se: { sourceUrl: 'https://www.imy.se/en/', lastUpdated: '2026-07-07' },
  ng: { sourceUrl: 'https://ndpc.gov.ng/', lastUpdated: '2026-07-07' },
  za: { sourceUrl: 'https://inforegulator.org.za/', lastUpdated: '2026-07-07' },
  ke: { sourceUrl: 'https://www.odpc.go.ke/', lastUpdated: '2026-07-07' },
  gh: { sourceUrl: 'https://www.dataprotection.org.gh/', lastUpdated: '2026-07-07' },
  eg: { sourceUrl: 'https://mcit.gov.eg/', lastUpdated: '2026-07-07' },
  us: { sourceUrl: 'https://www.ftc.gov/business-guidance/privacy-security', lastUpdated: '2026-07-07' },
  ca: { sourceUrl: 'https://www.priv.gc.ca/en/', lastUpdated: '2026-07-07' },
  br: { sourceUrl: 'https://www.gov.br/anpd/pt-br', lastUpdated: '2026-07-07' },
  mx: { sourceUrl: 'https://home.inai.org.mx/', lastUpdated: '2026-07-07' },
  co: { sourceUrl: 'https://www.sic.gov.co/', lastUpdated: '2026-07-07' },
  sg: { sourceUrl: 'https://www.pdpc.gov.sg/', lastUpdated: '2026-07-07' },
  jp: { sourceUrl: 'https://www.ppc.go.jp/en/', lastUpdated: '2026-07-07' },
  au: { sourceUrl: 'https://www.oaic.gov.au/', lastUpdated: '2026-07-07' },
  in: { sourceUrl: 'https://www.meity.gov.in/', lastUpdated: '2026-07-07' },
  kr: { sourceUrl: 'https://www.pipc.go.kr/eng/', lastUpdated: '2026-07-07' },
  ae: { sourceUrl: 'https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws', lastUpdated: '2026-07-07' },
  sa: { sourceUrl: 'https://sdaia.gov.sa/', lastUpdated: '2026-07-07' },
  il: { sourceUrl: 'https://www.gov.il/en/departments/the_privacy_protection_authority/govil-landing-page', lastUpdated: '2026-07-07' },
  qa: { sourceUrl: 'https://www.motc.gov.qa/', lastUpdated: '2026-07-07' },
  kw: { sourceUrl: 'https://citra.gov.kw/', lastUpdated: '2026-07-07' },
};

function withSourceMetadata(rulePack, countryId) {
  return { ...rulePack, ...(SOURCE_METADATA_BY_COUNTRY[countryId] || SOURCE_METADATA_BY_COUNTRY.us) };
}

// =====================================
// REGULATIONS DATABASE
// Industry × Country → Requirements
// =====================================
export const REGULATIONS = {
  banking: {
    de: {
      framework: 'GDPR + BaFin KWG + PSD2',
      authority: 'BaFin (Federal Financial Supervisory Authority)',
      requirements: [
        { id: 'b-de-1', ref: 'KWG §25a', title: 'Risk Management System', category: 'risk', severity: 'critical', description: 'Banks must maintain an adequate risk management system with documented processes for identifying, measuring, controlling and monitoring all material risks.' },
        { id: 'b-de-2', ref: 'GDPR Art.32', title: 'Encryption of Financial PII', category: 'security', severity: 'critical', description: 'Customer financial data including IBAN, card numbers, account balances must be encrypted at rest and in transit using AES-256 or equivalent.' },
        { id: 'b-de-3', ref: 'PSD2 Art.97', title: 'Strong Customer Authentication (SCA)', category: 'authentication', severity: 'critical', description: 'All electronic payment transactions must implement SCA using at least 2 of: knowledge, possession, inherence factors.' },
        { id: 'b-de-4', ref: 'AMLD5', title: 'KYC & Customer Due Diligence', category: 'kyc', severity: 'critical', description: 'Identity verification must be completed before account activation. Enhanced due diligence required for high-risk customers.' },
        { id: 'b-de-5', ref: 'GDPR Art.17', title: 'Right to Erasure', category: 'data_rights', severity: 'high', description: 'Customer data deletion requests must be fulfilled within 30 days, with documented audit trail of deletion.' },
        { id: 'b-de-6', ref: 'PCI-DSS v4.0', title: 'Card Data Protection', category: 'payment', severity: 'critical', description: 'CVV/CVC data must never be stored post-authorization. Full PAN storage requires tokenization. No card data in logs.' },
      ],
      complianceScore: 28,
      totalGaps: 8,
      criticalGaps: 5,
    },
    gb: {
      framework: 'UK GDPR + FCA SYSC + PCI-DSS',
      authority: 'Financial Conduct Authority (FCA)',
      requirements: [
        { id: 'b-gb-1', ref: 'FCA SYSC 13', title: 'Operational Resilience', category: 'resilience', severity: 'critical', description: 'Banks must identify important business services and set impact tolerances for disruptions, with documented recovery procedures.' },
        { id: 'b-gb-2', ref: 'UK GDPR Art.32', title: 'Data Encryption Standards', category: 'security', severity: 'critical', description: 'All customer financial records must use encryption at rest. TLS 1.2+ required for all data in transit.' },
        { id: 'b-gb-3', ref: 'PSR 2017', title: 'Payment Services Regulations', category: 'payment', severity: 'critical', description: 'Strong authentication required for remote transactions. Fraud liability frameworks must be implemented.' },
        { id: 'b-gb-4', ref: 'MLR 2017', title: 'Anti-Money Laundering Controls', category: 'aml', severity: 'critical', description: 'Automated transaction monitoring systems required. Suspicious activity reports must be filed within 7 days.' },
        { id: 'b-gb-5', ref: 'FCA COBS 2.1', title: 'Client Communication Standards', category: 'communication', severity: 'high', description: 'All client communications must be fair, clear, and not misleading. Fee disclosures are mandatory.' },
      ],
      complianceScore: 32,
      totalGaps: 7,
      criticalGaps: 4,
    },
    ng: {
      framework: 'CBN Guidelines + NDPR + BOFIA',
      authority: 'Central Bank of Nigeria (CBN)',
      requirements: [
        { id: 'b-ng-1', ref: 'CBN KYC 2023', title: 'Customer Identification Programme', category: 'kyc', severity: 'critical', description: 'BVN verification mandatory for all individual accounts. NIN required for accounts above tier 1 limits.' },
        { id: 'b-ng-2', ref: 'NDPR §2.1', title: 'Data Lawful Basis', category: 'data_rights', severity: 'critical', description: 'Personal data processing must have a documented lawful basis. Consent must be freely given and withdrawable.' },
        { id: 'b-ng-3', ref: 'CBN PSP 2021', title: 'Transaction Monitoring', category: 'aml', severity: 'critical', description: 'Automated monitoring for suspicious transactions above ₦5M. Reports to NFIU within 24 hours.' },
        { id: 'b-ng-4', ref: 'PCI-DSS', title: 'Card Data Security', category: 'payment', severity: 'critical', description: 'No CVV storage permitted. Tokenization required for card transactions. EMV chip compliance mandatory.' },
      ],
      complianceScore: 31,
      totalGaps: 6,
      criticalGaps: 4,
    },
    us: {
      framework: 'GLBA + CCPA + PCI-DSS + BSA/AML',
      authority: 'CFPB / OCC / Federal Reserve',
      requirements: [
        { id: 'b-us-1', ref: 'GLBA §501', title: 'Safeguards Rule', category: 'security', severity: 'critical', description: 'Financial institutions must implement a comprehensive information security program with designated security officer.' },
        { id: 'b-us-2', ref: 'BSA/AML', title: 'Bank Secrecy Act Compliance', category: 'aml', severity: 'critical', description: 'CTR filing for cash transactions >$10k. SAR filing for suspicious activity >$5k. Customer due diligence program required.' },
        { id: 'b-us-3', ref: 'CCPA', title: 'California Consumer Privacy', category: 'data_rights', severity: 'high', description: 'Right to know, delete, and opt-out of sale of personal information for California residents.' },
        { id: 'b-us-4', ref: 'Reg E', title: 'Electronic Fund Transfer Act', category: 'payment', severity: 'high', description: 'Error resolution procedures and liability limits for unauthorized electronic transfers must be documented.' },
      ],
      complianceScore: 35,
      totalGaps: 6,
      criticalGaps: 3,
    },
    sg: {
      framework: 'MAS TRM + PDPA + Payment Services Act',
      authority: 'Monetary Authority of Singapore (MAS)',
      requirements: [
        { id: 'b-sg-1', ref: 'MAS TRM §4', title: 'IT Risk Management', category: 'risk', severity: 'critical', description: 'Board-approved IT risk appetite statement required. Penetration testing annually for internet-facing systems.' },
        { id: 'b-sg-2', ref: 'PDPA §24', title: 'Data Protection', category: 'security', severity: 'critical', description: 'Reasonable security arrangements to prevent unauthorized access, collection, use, disclosure, copying or disposal.' },
        { id: 'b-sg-3', ref: 'PS Act', title: 'Payment Services License', category: 'licensing', severity: 'critical', description: 'License required for payment services. AML/CFT controls, user protection measures and cybersecurity requirements apply.' },
      ],
      complianceScore: 40,
      totalGaps: 5,
      criticalGaps: 3,
    },
  },

  shipping: {
    de: {
      framework: 'GDPR + EU Customs Code + eIDAS',
      authority: 'Bundeszollverwaltung (German Customs Authority)',
      requirements: [
        { id: 's-de-1', ref: 'UCC Art.12', title: 'Customs Data Encryption', category: 'security', severity: 'critical', description: 'All electronic customs declarations containing recipient personal data must be transmitted over encrypted channels (TLS 1.3+).' },
        { id: 's-de-2', ref: 'GDPR Art.44', title: 'Cross-Border Data Transfer Controls', category: 'data_transfer', severity: 'critical', description: 'Transfers of EU resident data to third countries require adequacy decision or standard contractual clauses.' },
        { id: 's-de-3', ref: 'GDPR Art.13', title: 'Recipient Notification', category: 'transparency', severity: 'high', description: 'Recipients must be notified that their personal data will be shared with customs authorities in destination country.' },
        { id: 's-de-4', ref: 'GDPR Art.5(1)(e)', title: 'Data Retention Limits', category: 'retention', severity: 'high', description: 'Shipment records containing PII must be purged after regulatory retention period (typically 10 years). Automated deletion required.' },
        { id: 's-de-5', ref: 'eIDAS', title: 'Electronic Signature on Manifests', category: 'authentication', severity: 'medium', description: 'Customs manifests for cross-border shipments should use qualified electronic signatures for authenticity.' },
      ],
      complianceScore: 38,
      totalGaps: 7,
      criticalGaps: 4,
    },
    ng: {
      framework: 'NDPR + NCS Guidelines + NIMASA',
      authority: 'Nigeria Customs Service (NCS)',
      requirements: [
        { id: 's-ng-1', ref: 'NDPR §2.6', title: 'Cross-Border Transfer Consent', category: 'data_transfer', severity: 'critical', description: 'Data subjects must explicitly consent to transfer of their personal data across Nigerian borders. Consent records must be maintained.' },
        { id: 's-ng-2', ref: 'NCS Form M', title: 'Import Documentation Compliance', category: 'customs', severity: 'critical', description: 'Pre-arrival assessment reports required for shipments above USD 1,000. HS code verification mandatory.' },
        { id: 's-ng-3', ref: 'NDPR §2.1', title: 'Lawful Processing of Recipient Data', category: 'data_rights', severity: 'high', description: 'Recipient PII must be processed only for shipment delivery purpose. Secondary use requires separate consent.' },
      ],
      complianceScore: 45,
      totalGaps: 5,
      criticalGaps: 3,
    },
    gb: {
      framework: 'UK GDPR + HMRC Customs + Border Protocol',
      authority: 'HMRC / Border Force',
      requirements: [
        { id: 's-gb-1', ref: 'UK GDPR Art.46', title: 'International Transfer Safeguards', category: 'data_transfer', severity: 'critical', description: 'UK GDPR standard contractual clauses required for personal data transferred outside UK in customs processing.' },
        { id: 's-gb-2', ref: 'HMRC 2021', title: 'Customs Declaration Service (CDS)', category: 'customs', severity: 'critical', description: 'All imports must use HMRC Customs Declaration Service. EORI number required for all commercial shipments.' },
        { id: 's-gb-3', ref: 'UK GDPR Art.17', title: 'Data Erasure on Request', category: 'data_rights', severity: 'high', description: 'Recipient data must be erasable upon request, subject to customs retention requirements (7 years).' },
      ],
      complianceScore: 41,
      totalGaps: 5,
      criticalGaps: 3,
    },
    us: {
      framework: 'CBP ACE + CCPA + TSA Cargo Security',
      authority: 'US Customs and Border Protection (CBP)',
      requirements: [
        { id: 's-us-1', ref: 'CBP ACE', title: 'Automated Commercial Environment', category: 'customs', severity: 'critical', description: 'All imports must be filed through CBP ACE. Importer Security Filing (ISF) required 24h before vessel loading.' },
        { id: 's-us-2', ref: 'TSA ACAS', title: 'Air Cargo Advance Screening', category: 'security', severity: 'critical', description: 'Air cargo must be screened before loading. Carrier must transmit cargo data to TSA at least 4 hours before departure.' },
        { id: 's-us-3', ref: 'CCPA', title: 'California Recipient Data Rights', category: 'data_rights', severity: 'high', description: 'California-based recipients have right to know what data is collected and right to deletion of shipment records.' },
      ],
      complianceScore: 48,
      totalGaps: 4,
      criticalGaps: 2,
    },
    sg: {
      framework: 'PDPA + Singapore Customs TradeNet',
      authority: 'Singapore Customs',
      requirements: [
        { id: 's-sg-1', ref: 'TradeNet', title: 'Electronic Trade Documentation', category: 'customs', severity: 'critical', description: 'All import/export permits must be processed through TradeNet. Advance cargo reporting required for sea/air freight.' },
        { id: 's-sg-2', ref: 'PDPA §26', title: 'Transfer Limitation Obligation', category: 'data_transfer', severity: 'critical', description: 'Organizations must ensure overseas recipients provide comparable protection to PDPA standards.' },
      ],
      complianceScore: 65,
      totalGaps: 4,
      criticalGaps: 2,
    },
  },

  entertainment: {
    de: {
      framework: 'GDPR + JMStV + UrhG',
      authority: 'Landesmedienanstalten (State Media Authorities)',
      requirements: [
        { id: 'e-de-1', ref: 'JMStV §5', title: 'Youth Protection & Age Verification', category: 'age_verification', severity: 'critical', description: 'Platforms offering content rated 16+ or 18+ must implement verified age gates. Self-declaration is insufficient — ID verification required.' },
        { id: 'e-de-2', ref: 'UrhG §44b', title: 'Content Licensing & Copyright', category: 'ip_rights', severity: 'critical', description: 'All streamed content must have documented licenses for DE territory. Geo-blocking required for content without German rights.' },
        { id: 'e-de-3', ref: 'GDPR Art.7', title: 'Cookie & Tracking Consent', category: 'consent', severity: 'critical', description: 'Explicit, informed consent required before any analytics, advertising, or behavioral tracking cookies are set.' },
        { id: 'e-de-4', ref: 'GDPR Art.17', title: 'Account & Data Deletion', category: 'data_rights', severity: 'high', description: 'Users must be able to delete their account and all associated data (watch history, preferences, payment info) within 30 days.' },
        { id: 'e-de-5', ref: 'DSGVO', title: 'Data Minimization for Analytics', category: 'data_minimization', severity: 'high', description: 'Behavioral tracking data must be anonymized or pseudonymized. Purpose limitation applies — cannot use watch data for unrelated profiling.' },
      ],
      complianceScore: 22,
      totalGaps: 9,
      criticalGaps: 5,
    },
    gb: {
      framework: 'UK GDPR + Online Safety Act + BBFC',
      authority: 'Ofcom / BBFC',
      requirements: [
        { id: 'e-gb-1', ref: 'Online Safety Act 2023', title: 'Age Assurance for Adult Content', category: 'age_verification', severity: 'critical', description: 'Platforms must implement "highly effective" age verification. Acceptable methods: credit card check, digital ID, or third-party age verification service.' },
        { id: 'e-gb-2', ref: 'BBFC', title: 'Content Classification Compliance', category: 'content_rating', severity: 'critical', description: 'All video-on-demand content must carry BBFC classification or equivalent. Misclassification can result in £18M fines.' },
        { id: 'e-gb-3', ref: 'UK GDPR Art.8', title: "Children's Data Protection", category: 'childrens_data', severity: 'critical', description: "Parental consent required for processing data of users under 13. Age-appropriate design code applies to services likely used by children." },
        { id: 'e-gb-4', ref: 'ICO Cookie Guidance', title: 'Consent Before Tracking', category: 'consent', severity: 'high', description: 'No tracking cookies or pixels may be set before user provides informed, specific consent. Pre-ticked boxes are not valid consent.' },
      ],
      complianceScore: 25,
      totalGaps: 8,
      criticalGaps: 4,
    },
    ng: {
      framework: 'NBC Code + NDPR + NFVCB',
      authority: 'National Broadcasting Commission (NBC)',
      requirements: [
        { id: 'e-ng-1', ref: 'NFVCB Act', title: 'Content Classification', category: 'content_rating', severity: 'critical', description: 'All video content must be classified by NFVCB before distribution. Minimum age ratings must be displayed.' },
        { id: 'e-ng-2', ref: 'NBC Code §5', title: 'Local Content Quota', category: 'local_content', severity: 'high', description: 'Streaming platforms serving Nigerian users must ensure minimum 30% local Nigerian content in their catalogue.' },
        { id: 'e-ng-3', ref: 'NDPR §2.5', title: 'User Consent for Data Collection', category: 'consent', severity: 'critical', description: 'Explicit user consent required before collecting viewing behavior data. Users must be informed in plain language.' },
      ],
      complianceScore: 42,
      totalGaps: 5,
      criticalGaps: 3,
    },
    us: {
      framework: 'COPPA + CCPA + FTC Guidelines',
      authority: 'FTC / State AGs',
      requirements: [
        { id: 'e-us-1', ref: 'COPPA', title: "Children's Online Privacy Protection", category: 'childrens_data', severity: 'critical', description: "Verifiable parental consent required before collecting personal information from children under 13. No behavioral advertising to children." },
        { id: 'e-us-2', ref: 'CCPA', title: 'Consumer Privacy Rights', category: 'data_rights', severity: 'high', description: 'California users have right to know, delete, and opt-out of sale of watch history, behavioral data, and preferences.' },
        { id: 'e-us-3', ref: 'DMCA', title: 'Digital Millennium Copyright Act', category: 'ip_rights', severity: 'critical', description: 'Platform must implement notice-and-takedown procedures. Safe harbor requires designated DMCA agent and expedient takedown.' },
        { id: 'e-us-4', ref: 'FTC DRM', title: 'DRM & Content Protection', category: 'drm', severity: 'high', description: 'Streaming content must implement Digital Rights Management to prevent unauthorized copying and redistribution.' },
      ],
      complianceScore: 35,
      totalGaps: 7,
      criticalGaps: 3,
    },
    sg: {
      framework: 'IMDA Guidelines + PDPA + Broadcast Act',
      authority: 'Infocomm Media Development Authority (IMDA)',
      requirements: [
        { id: 'e-sg-1', ref: 'IMDA OTT', title: 'Over-the-Top Content License', category: 'licensing', severity: 'critical', description: 'Video streaming platforms with significant reach must hold IMDA OTT Content Provider license.' },
        { id: 'e-sg-2', ref: 'PDPA §14', title: 'Behavioral Data Retention Limits', category: 'retention', severity: 'high', description: 'User behavioral data must not be retained beyond business purpose. Automatic deletion schedules required.' },
        { id: 'e-sg-3', ref: 'Media Literacy Council', title: 'Content Rating Compliance', category: 'content_rating', severity: 'high', description: 'All content must carry approved rating labels (G, PG, PG13, NC16, M18, R21). Age-gating mandatory for R21 content.' },
      ],
      complianceScore: 50,
      totalGaps: 4,
      criticalGaps: 2,
    },
  },
};

// =====================================
// DEMO CODEBASES METADATA
// =====================================
// Real, already-scanned open-source repos are listed first within their
// industry group (auto-selected/highlighted by default) since they're the
// stronger demo. Selecting one navigates straight to its existing completed
// analysis instead of running a fresh backend/offline demo seed — see
// NewAnalysis.jsx.
export const DEMO_CODEBASES = [
  {
    id: 'ghostfolio',
    name: 'Ghostfolio (Open Source Wealth Management)',
    industry: 'banking',
    language: 'TypeScript (Angular + NestJS)',
    languageIcon: '🦕',
    description: 'Real production wealth management app, actively used by real self-hosters.',
    files: Array.from({ length: 802 }),
    linesOfCode: 94000,
    real: true,
    liveAnalysisId: 7,
  },
  {
    id: 'neobank',
    name: 'NeoBank API',
    industry: 'banking',
    language: 'Python (Flask)',
    languageIcon: '🐍',
    description: 'Core banking REST API with customer registration, authentication, KYC and payment processing.',
    files: ['main.py'],
    linesOfCode: 142,
    path: 'demo-codebases/neobank-api/',
    violations: [
      'Plaintext password storage in SQLite',
      'CVV and full PAN stored in transactions table',
      'No KYC enforcement before transactions',
      'PII logged in DEBUG level',
      'Hardcoded secret key in source',
      'No Right to Erasure endpoint',
      'Unauthenticated customer list endpoint',
    ],
    scoreByCountry: {
      de: 28, gb: 32, ng: 31, us: 35, sg: 40,
      fr: 29, nl: 30, se: 33, za: 36, ke: 38,
      gh: 37, eg: 34, ca: 36, br: 33, mx: 38,
      co: 40, jp: 41, au: 39, kr: 42, in: 37,
      ae: 44, sa: 43, il: 45, qa: 42, kw: 43,
    },
  },
  {
    id: 'nodegoat',
    name: 'NodeGoat (OWASP demo fork)',
    industry: 'banking',
    language: 'Node.js (Express)',
    languageIcon: '⚡',
    description: 'Real OWASP Top 10 training app (Node.js/Express) — genuine repo, genuine findings.',
    files: Array.from({ length: 34 }),
    linesOfCode: 2100,
    real: true,
    liveAnalysisId: 5,
  },
  {
    id: 'navidrome',
    name: 'Navidrome (Self-hosted Music Streaming)',
    industry: 'entertainment',
    language: 'Go',
    languageIcon: '🎧',
    description: 'Real production self-hosted music streaming server, actively used by real self-hosters.',
    files: Array.from({ length: 1360 }),
    linesOfCode: 56000,
    real: true,
    liveAnalysisId: 8,
  },
  {
    id: 'streamvault',
    name: 'StreamVault',
    industry: 'entertainment',
    language: 'Node.js (Express)',
    languageIcon: '⚡',
    description: 'Video streaming platform with user authentication, content delivery and subscription management.',
    files: ['server.js'],
    linesOfCode: 158,
    path: 'demo-codebases/streamvault/',
    violations: [
      'No age verification despite adult content',
      'Watch history recorded without consent',
      'Cookie tracking without consent banner',
      'Payment card data stored in user profile',
      'JWT token valid for 365 days',
      'No account deletion (Right to Erasure)',
      'Content regions not enforced on delivery',
    ],
    scoreByCountry: {
      de: 22, gb: 25, ng: 42, us: 35, sg: 50,
      fr: 23, nl: 24, se: 26, za: 44, ke: 46,
      gh: 45, eg: 43, ca: 36, br: 38, mx: 42,
      co: 44, jp: 38, au: 37, kr: 40, in: 43,
      ae: 48, sa: 47, il: 49, qa: 46, kw: 47,
    },
  },
  {
    id: 'vulpy',
    name: 'Vulpy (Security Training App)',
    industry: 'shipping',
    language: 'Python (Flask)',
    languageIcon: '🐍',
    description: 'Real security-training app (Python/Flask) with side-by-side good/bad implementations.',
    files: Array.from({ length: 18 }),
    linesOfCode: 900,
    real: true,
    liveAnalysisId: 6,
  },
  {
    id: 'cargotrack',
    name: 'CargoTrack',
    industry: 'shipping',
    language: 'Python (Flask)',
    languageIcon: '🐍',
    description: 'Global shipment tracking platform with customs declaration management and cross-border logistics.',
    files: ['app.py'],
    linesOfCode: 167,
    path: 'demo-codebases/cargotrack/',
    violations: [
      'Cross-border PII transfer without consent',
      'Customs data sent over HTTP (not HTTPS)',
      'Recipient national ID exposed unauthenticated',
      'GPS data retained indefinitely',
      'Plaintext password and API key storage',
      'No data retention/purge policy',
      'Full shipment list accessible without auth',
    ],
    scoreByCountry: {
      de: 38, gb: 41, ng: 45, us: 48, sg: 65,
      fr: 39, nl: 40, se: 43, za: 50, ke: 52,
      gh: 51, eg: 49, ca: 49, br: 46, mx: 50,
      co: 52, jp: 53, au: 54, kr: 55, in: 51,
      ae: 58, sa: 57, il: 59, qa: 56, kw: 57,
    },
  },
];

/**
 * Get regulations for a specific industry + country combination.
 * Returns null if combination not found (falls back to similar country).
 */
export function getRegulations(industryId, countryId) {
  const industryRegs = REGULATIONS[industryId];
  if (!industryRegs) return null;

  // Direct match
  if (industryRegs[countryId]) return withSourceMetadata(industryRegs[countryId], countryId);

  // Continent-based fallback — use nearest neighbor
  const fallbackMap = {
    fr: 'de', nl: 'de', se: 'de',  // EU → Germany fallback
    za: 'ng', ke: 'ng', gh: 'ng', eg: 'ng',  // Africa → Nigeria fallback
    ca: 'us', br: 'us', mx: 'us', co: 'us',  // Americas → US fallback
    jp: 'sg', au: 'sg', kr: 'sg', in: 'sg',  // APAC → Singapore fallback
    sa: 'ae', il: 'ae', qa: 'ae', kw: 'ae',  // Middle East → UAE fallback
  };

  const fallbackCountry = fallbackMap[countryId];
  if (fallbackCountry && industryRegs[fallbackCountry]) {
    return { ...withSourceMetadata(industryRegs[fallbackCountry], fallbackCountry), isFallback: true, fallbackFrom: countryId };
  }

  // Generic fallback using first available country in industry
  const firstKey = Object.keys(industryRegs)[0];
  return { ...withSourceMetadata(industryRegs[firstKey], firstKey), isFallback: true };
}

/**
 * Get compliance score for a demo codebase in a specific country.
 */
export function getDemoScore(codebaseId, countryId) {
  const cb = DEMO_CODEBASES.find(c => c.id === codebaseId);
  if (!cb) return 50;
  return cb.scoreByCountry[countryId] || 45;
}

/**
 * Generate a realistic scan result for a demo codebase.
 */
export function generateDemoScanResult(codebaseId, industryId, countryId) {
  const codebase = DEMO_CODEBASES.find(c => c.id === codebaseId);
  const regs = getRegulations(industryId, countryId);
  const score = getDemoScore(codebaseId, countryId);

  if (!codebase || !regs) return null;

  const gaps = regs.requirements.map((req, idx) => ({
    id: `gap-${codebaseId}-${countryId}-${idx}`,
    status: idx < regs.criticalGaps ? 'non_compliant' : (idx < regs.totalGaps ? 'partial' : 'compliant'),
    gap_description: codebase.violations[idx % codebase.violations.length],
    code_location: `${codebase.path}${codebase.files[0]}:L${20 + idx * 15}-${35 + idx * 15}`,
    priority: req.severity,
    requirement: {
      article_reference: req.ref,
      title: req.title,
      description: req.description,
      severity: req.severity,
      category: req.category,
    },
    remediation_plan: generateRemediationPlan(req),
  }));

  return {
    id: `demo-${codebaseId}-${countryId}`,
    status: 'complete',
    overall_score: score,
    industry: industryId,
    country: countryId,
    framework: regs.framework,
    authority: regs.authority,
    project: { name: codebase.name },
    regulation: { name: regs.framework },
    model_provider: 'Compliance AutoPilot Engine',
    model_names: 'CAP-Analyzer v2, CAP-GapDetector v1',
    remediation_approval_status: 'pending_review',
    gaps,
    totalGaps: regs.totalGaps,
    criticalGaps: regs.criticalGaps,
    created_at: new Date().toISOString(),
  };
}

function generateRemediationPlan(req) {
  const plans = {
    security: `1. **Encrypt at rest**: Apply AES-256 encryption to all ${req.title.toLowerCase()} fields.\n2. **Encrypt in transit**: Enforce TLS 1.3 for all API communications.\n3. **Key management**: Use a secrets manager (AWS KMS, HashiCorp Vault) for encryption keys.`,
    kyc: `1. **Integrate KYC provider**: Connect to a certified KYC service (Jumio, Onfido, or Smile ID).\n2. **Enforce pre-transaction check**: Block transactions until KYC status is 'verified'.\n3. **Document audit trail**: Log all KYC decisions with timestamps.`,
    authentication: `1. **Implement MFA**: Add TOTP or SMS-based second factor.\n2. **Token expiry**: Set JWT tokens to expire after 15-30 minutes.\n3. **Session invalidation**: Implement server-side session tracking for logout.`,
    data_rights: `1. **Create deletion endpoint**: Add DELETE /api/user/:id that cascades to all related records.\n2. **Automate erasure**: Implement scheduled jobs to purge expired data.\n3. **Audit log**: Record all deletion requests and completions.`,
    data_transfer: `1. **Consent collection**: Add explicit consent checkbox before any cross-border data transfer.\n2. **SCCs**: Implement Standard Contractual Clauses for international data flows.\n3. **Encryption in transit**: Use TLS 1.3 with certificate pinning for customs broker API calls.`,
    consent: `1. **Consent banner**: Implement a GDPR-compliant cookie consent solution (e.g., OneTrust, Cookiebot).\n2. **Consent storage**: Record consent with timestamp, IP, and version of policy accepted.\n3. **Preference center**: Allow users to manage and withdraw consent at any time.`,
    age_verification: `1. **Implement age gate**: Integrate a certified age verification service.\n2. **Enforce at content level**: Check age rating against verified user age before streaming.\n3. **Parental controls**: Add parental PIN option for family accounts.`,
    content_rating: `1. **Add rating metadata**: Ensure all content has classification tags in the database.\n2. **Display ratings**: Show BBFC/equivalent ratings in the UI before content starts.\n3. **Geo-blocking**: Restrict content to licensed regions only.`,
  };

  return plans[req.category] || `1. Review ${req.ref} requirements documentation.\n2. Implement required controls for ${req.title}.\n3. Conduct internal audit to verify compliance.`;
}
