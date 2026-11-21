import { Platform, Share, Alert } from 'react-native';

export function downloadOrShareTextFile(filename: string, content: string, mimeType: string = 'text/plain') {
  if (Platform.OS === 'web') {
    try {
      const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Web download error:', err);
      Alert.alert('Download Error', err.message || 'Failed to download file');
    }
  } else {
    // Native Mobile (iOS / Android) Share dialog
    Share.share({
      title: filename,
      message: content,
    }).catch(err => {
      console.warn('Share error:', err);
    });
  }
}
