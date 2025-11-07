import React, { useState } from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon: string;
}

const AuthInput: React.FC<AuthInputProps> = ({ icon, type, ...props }) => {
    const isPassword = type === 'password';
    const [showPassword, setShowPassword] = useState(false);
    
    const inputType = isPassword && showPassword ? 'text' : type;
    const toggleIcon = showPassword ? 'visibility_off' : 'visibility';

    return (
        <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary-dark">{icon}</span>
            <input
                {...props}
                type={inputType}
                className="w-full bg-background-dark border-2 border-card-dark rounded-full py-3 pl-12 pr-4 text-white placeholder-text-secondary-dark focus:ring-2 focus:ring-primary focus:border-primary transition-all"
            />
            
            {isPassword && (
                <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary-dark hover:text-white transition-colors p-1"
                    aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                >
                    <span className="material-symbols-outlined text-xl">{toggleIcon}</span>
                </button>
            )}
        </div>
    );
};

export default AuthInput;