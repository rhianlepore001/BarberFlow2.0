import React, { useState } from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon: string;
    focusRingClass?: string; // Nova prop para classe de foco
}

const AuthInput: React.FC<AuthInputProps> = ({ icon, type, focusRingClass = 'focus:ring-primary focus:border-primary', ...props }) => {
    const isPassword = type === 'password';
    const [showPassword, setShowPassword] = useState(false);
    
    const inputType = isPassword && showPassword ? 'text' : type;
    const toggleIcon = showPassword ? 'visibility_off' : 'visibility';

    return (
        <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">{icon}</span>
            <input
                {...props}
                type={inputType}
                // Alterado para usar bg-card e text-text-primary para se adaptar ao tema claro/escuro
                className={`w-full bg-card border-2 border-card rounded-full py-3 pl-12 pr-4 text-text-primary placeholder-text-secondary focus:ring-2 ${focusRingClass} transition-all`}
            />
            
            {isPassword && (
                <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors p-1"
                    aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                >
                    <span className="material-symbols-outlined text-xl">{toggleIcon}</span>
                </button>
            )}
        </div>
    );
};

export default AuthInput;