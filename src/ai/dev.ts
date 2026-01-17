
import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-harvest-data.ts';
import '@/ai/flows/validate-production-data.ts';
import '@/ai/flows/predict-yield.ts';
import '@/ai/flows/generate-weather-alerts.ts';
import '@/ai/tools/weather-tool.ts';
import '@/ai/flows/validate-packaging-data.ts';
import '@/ai/flows/recommend-applications.ts';
import '@/ai/flows/diagnose-plant-health.ts';
import '@/ai/flows/summarize-agronomist-report.ts';
