import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { 
  ATTR_SERVICE_NAME, 
  ATTR_SERVICE_VERSION 
} from '@opentelemetry/semantic-conventions';

// Only initialize in production or when explicitly enabled
const isEnabled = process.env.OTEL_ENABLED === 'true' || process.env.NODE_ENV === 'production';

let sdk: NodeSDK | undefined;

// Parse OTEL_EXPORTER_OTLP_HEADERS into a headers object
function parseOtlpHeaders(headersString?: string): Record<string, string> {
  if (!headersString) {
    console.warn('⚠️ OTEL_EXPORTER_OTLP_HEADERS is not set');
    return {};
  }

  const headers: Record<string, string> = {};

  // Try to parse as JSON first
  if (headersString.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(headersString);
      Object.assign(headers, parsed);
      console.log(`✓ Parsed ${Object.keys(headers).length} headers from JSON`);
      return headers;
    } catch (error) {
      console.error('❌ Failed to parse headers as JSON:', error);
      return {};
    }
  }

  // Otherwise, parse as comma-separated key=value pairs
  const headerPairs = headersString.split(',');

  for (const pair of headerPairs) {
    const equalIndex = pair.indexOf('=');
    if (equalIndex === -1) {
      console.warn(`⚠️ Invalid header format: ${pair}`);
      continue;
    }

    const key = pair.substring(0, equalIndex).trim();
    let value = pair.substring(equalIndex + 1).trim();

    // Decode URL-encoded values (e.g., %20 -> space)
    try {
      value = decodeURIComponent(value);
    } catch (error) {
      console.warn(`⚠️ Failed to decode value for ${key}, using as-is`);
    }

    if (key && value) {
      headers[key] = value;
      console.log(`✓ Parsed header: ${key} = ${value.substring(0, 20)}...`);
    }
  }

  return headers;
}

export async function register() {
  if (!isEnabled) {
    console.log('OpenTelemetry is disabled');
    return;
  }

  if (sdk) {
    return;
  }

  // Parse headers from OTEL_EXPORTER_OTLP_HEADERS
  const headers = parseOtlpHeaders(process.env.OTEL_EXPORTER_OTLP_HEADERS);

  // Get endpoint
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';

  console.log('🔍 OTEL Configuration:', {
    enabled: isEnabled,
    endpoint,
    headersCount: Object.keys(headers).length,
    headerKeys: Object.keys(headers),
    environment: process.env.NODE_ENV,
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${endpoint}/v1/traces`,
    headers,
  });

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'couplefy',
      [ATTR_SERVICE_VERSION]: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    }),
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
        },
        // pg instrumentation doesn't work with postgres-js, using custom debug hook instead
        '@opentelemetry/instrumentation-pg': {
          enabled: false,
        },
      }),
    ],
  });

  try {
    sdk.start();
    console.log('✅ OpenTelemetry tracing initialized successfully');
    console.log('📊 Traces will be sent to:', endpoint);
  } catch (error) {
    console.error('❌ Error initializing OpenTelemetry:', error);
  }
}