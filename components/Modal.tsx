import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 z-40"
                        aria-hidden="true"
                    />
                    <motion.div
                        initial={{ y: "100%" }}
                        animate={{ y: "0%" }}
                        exit={{ y: "100%" }}
                        transition={{ type: 'tween', ease: 'circOut', duration: 0.4 }}
                        className="fixed bottom-0 left-0 w-full bg-card-dark rounded-t-2xl p-4 z-50"
                        role="dialog"
                        aria-modal="true"
                    >
                         <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-4" />
                         {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Modal;