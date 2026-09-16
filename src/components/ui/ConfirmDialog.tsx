import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import Modal from './Modal';
import Button from './Button';

interface ConfirmOptions {
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn>(() => Promise.resolve(false));

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<ConfirmOptions | null>(null);
  const [busy, setBusy] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    setState(opts);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleClose = (result: boolean) => {
    setBusy(false);
    setState(null);
    resolveRef.current?.(result);
    resolveRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => handleClose(false)}
        title={state?.title ?? ''}
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => handleClose(false)}>
              {state?.cancelLabel ?? 'Zrušit'}
            </Button>
            <Button
              variant={state?.variant === 'danger' ? 'danger' : 'primary'}
              loading={busy}
              onClick={() => {
                setBusy(true);
                handleClose(true);
              }}
            >
              {state?.confirmLabel ?? 'Ano, smazat'}
            </Button>
          </div>
        }
      >
        {state?.description && <p className="text-sm text-secondary">{state.description}</p>}
      </Modal>
    </ConfirmContext.Provider>
  );
};
