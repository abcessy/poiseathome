import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertCircle, HelpCircle, X } from 'lucide-react';

const AppDialogContext = createContext(null);

export const AppDialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null);
  const resolver = useRef(null);

  const close = useCallback(result => {
    setDialog(null);
    resolver.current?.(result);
    resolver.current = null;
  }, []);

  const open = useCallback(options => new Promise(resolve => {
    resolver.current = resolve;
    setDialog({ type: 'message', title: 'Notice', ...options });
  }), []);

  const confirmDialog = useCallback((message, options = {}) => open({
    type: 'confirm', message, title: options.title || 'Please confirm', confirmLabel: options.confirmLabel || 'Confirm', tone: options.tone || 'primary',
  }), [open]);

  const messageDialog = useCallback((message, options = {}) => open({
    type: 'message', message, title: options.title || 'Something needs attention', confirmLabel: options.confirmLabel || 'Okay', tone: options.tone || 'primary',
  }), [open]);

  return <AppDialogContext.Provider value={{ confirmDialog, messageDialog }}>
    {children}
    {dialog && <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#211426]/55 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="app-dialog-title" className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/30 bg-white shadow-2xl">
        <div className="flex items-start gap-4 p-6"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${dialog.tone === 'danger' ? 'bg-red-50 text-red-700' : 'bg-lavender text-primary-deep'}`}>{dialog.type === 'confirm' ? <HelpCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}</span><div className="min-w-0"><h2 id="app-dialog-title" className="text-lg font-bold">{dialog.title}</h2><p className="mt-2 text-sm leading-6 text-text-muted">{dialog.message}</p></div>{dialog.type === 'message' && <button onClick={() => close(true)} className="ml-auto text-gray-400 hover:text-gray-700" aria-label="Close"><X className="h-5 w-5" /></button>}</div>
        <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50/70 px-6 py-4">{dialog.type === 'confirm' && <button onClick={() => close(false)} className="btn-outline">Cancel</button>}<button onClick={() => close(true)} className={dialog.tone === 'danger' ? 'btn-primary bg-red-700 hover:bg-red-800' : 'btn-primary'}>{dialog.confirmLabel}</button></div>
      </div>
    </div>}
  </AppDialogContext.Provider>;
};

export const useAppDialog = () => useContext(AppDialogContext);
