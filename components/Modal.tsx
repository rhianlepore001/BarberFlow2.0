import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
    const constraintsRef = useRef(null);
    
    const handleDragEnd = (_event: any, info: any) => {
        // Fecha o modal se o arrasto vertical for maior que 100 pixels para baixo
        if (info.offset.y > 100) {
            onClose();
        }
    };

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
                        ref={constraintsRef}
                        initial={{ y: "100%" }}
                        animate={{ y: "0%" }}
                        exit={{ y: "100%" }}
                        transition={{ type: 'tween', ease: 'circOut', duration: 0.4 }}
                        className="fixed bottom-0 left-0 w-full bg-card rounded-t-2xl p-4 z-50 cursor-grab"
                        role="dialog"
                        aria-modal="true"
                        // Configurações de arrasto
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 300 }} // Permite arrastar para baixo até 300px
                        onDragEnd={handleDragEnd}
                        dragElastic={0.2}
                    >
                         <div className="w-12 h-1.5 bg-gray-600 rounded-full mx-auto mb-4 cursor-grab" />
                         {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Modal;