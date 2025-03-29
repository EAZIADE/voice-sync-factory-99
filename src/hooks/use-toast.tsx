
import * as React from "react";
import {
  Toast,
  ToastActionElement,
  ToastProps
} from "@/components/ui/toast";

const TOAST_LIMIT = 20;
const TOAST_REMOVE_DELAY = 1000000;

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type ToasterState = {
  toasts: ToasterToast[];
};

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

type ActionType = typeof actionTypes;

type Action =
  | {
      type: ActionType["ADD_TOAST"];
      toast: ToasterToast;
    }
  | {
      type: ActionType["UPDATE_TOAST"];
      toast: Partial<ToasterToast>;
    }
  | {
      type: ActionType["DISMISS_TOAST"];
      toastId?: string;
    }
  | {
      type: ActionType["REMOVE_TOAST"];
      toastId?: string;
    };

interface State {
  toasts: ToasterToast[];
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        state.toasts.forEach((toast) => {
          addToRemoveQueue(toast.id);
        });
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

function addToRemoveQueue(toastId: string) {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
}

interface ToasterToastProps extends Partial<ToasterToast> {
  children?: React.ReactNode;
}

const toastInitialState: ToasterState = { toasts: [] };

// Create a React context to store the toast state and dispatch
type ToastContextType = {
  state: ToasterState;
  dispatch: React.Dispatch<Action>;
} | undefined;

const ToastContext = React.createContext<ToastContextType>(undefined);

// Module-level dispatch variable needs proper type initialization
let dispatch: React.Dispatch<Action> = () => {};

// Provider component that will wrap the app
export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatchAction] = React.useReducer(reducer, toastInitialState);
  
  // Store the dispatch function in our module-level variable so toast functions can use it
  React.useEffect(() => {
    dispatch = dispatchAction;
  }, [dispatchAction]);

  return (
    <ToastContext.Provider value={{ state, dispatch: dispatchAction }}>
      {children}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  // Make sure we're getting the latest context
  const context = React.useContext(ToastContext);
  
  const toast = React.useCallback((props: ToasterToastProps) => {
    const id = props.id || genId();

    dispatch({
      type: actionTypes.ADD_TOAST,
      toast: {
        ...props,
        id,
        open: true,
        onOpenChange: (open) => {
          if (!open) dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });
        },
      },
    });

    return {
      id: id,
      dismiss: () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id }),
      update: (props: ToasterToastProps) =>
        dispatch({
          type: actionTypes.UPDATE_TOAST,
          toast: { ...props, id },
        }),
    };
  }, []);

  return {
    toast,
    dismiss: React.useCallback((toastId?: string) =>
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId }), []),
    toasts: context?.state.toasts || toastInitialState.toasts,
  };
};

// This hook is used by the Toaster component to get the toast state
export const useToastContext = () => {
  const context = React.useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return context;
};

export type { ToasterToast, ToasterToastProps };
