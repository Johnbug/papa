'use client';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { shouldSendAnalytics, saveAnalyticsPreference } from '@/lib/analytics-preferences';
import { useI18n } from './i18n';

export function PrivacyNotice() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);
  useEffect(() => {
    const syncPreference = () => setEnabled(shouldSendAnalytics());
    window.addEventListener('storage', syncPreference);
    return () => window.removeEventListener('storage', syncPreference);
  }, []);
  return <>
    <button className="privacy-link" onClick={() => { setEnabled(shouldSendAnalytics()); setOpen(true); }}>{t.privacy}</button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="image-dialog privacy-dialog" showCloseButton={false}>
        <DialogClose className="image-dialog-close" aria-label={t.closePrivacy}><X size={20} /></DialogClose>
        <DialogTitle className="image-dialog-title">{t.privacy}</DialogTitle>
        <DialogDescription className="image-dialog-description">{t.privacyImagesTitle}</DialogDescription>
        <p>{t.privacyImages}</p>
        <h3>{t.privacyAnalyticsTitle}</h3><p>{t.privacyAnalytics}</p>
        <label className="analytics-setting"><input type="checkbox" checked={enabled} onChange={e => { saveAnalyticsPreference(e.target.checked); setEnabled(e.target.checked); }} />{t.analyticsSetting}</label>
        <h3>{t.privacyUseTitle}</h3><p>{t.privacyUse}</p>
      </DialogContent>
    </Dialog>
  </>;
}
