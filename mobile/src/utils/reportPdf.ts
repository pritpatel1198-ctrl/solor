import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { api } from '../api/client';

export async function generateAndShareFinancialReportPdf(
  params: {
    period?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    search?: string;
    financialYear?: string;
    currency?: string;
  } = {}
): Promise<boolean> {
  try {
    // Fetch authoritative report HTML and filename from backend
    const res = await api.getReportHtml(params);
    if (!res || !res.html) {
      throw new Error('Could not retrieve report template from server.');
    }

    const { html, filename = 'Financial_Report.pdf' } = res;

    if (Platform.OS === 'web') {
      await Print.printAsync({ html });
      return true;
    }

    // Native iOS and Android
    const { uri } = await Print.printToFileAsync({
      html,
      margins: {
        left: 20,
        right: 20,
        top: 20,
        bottom: 20,
      },
    });

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: filename,
        UTI: 'com.adobe.pdf',
      });
      return true;
    } else {
      Alert.alert('Notice', 'Sharing is not available on this device.');
      return false;
    }
  } catch (error: any) {
    console.error('Financial Report PDF Export error:', error);
    Alert.alert('PDF Export Error', error.message || 'Failed to generate financial report PDF');
    return false;
  }
}
