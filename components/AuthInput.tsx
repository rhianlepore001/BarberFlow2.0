import React, { useState } from 'react';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon: string;
    label: string; // Nova prop para o label
    focusRingClass?: string;
    error?: boolean; // Nova prop para indicar estado de erro
}

const AuthInput: React.FC<AuthInputProps> = ({ icon, label, type, focusRingClass = 'focus:ring-primary focus:border-primary', error = false, ...props }) => {
    const isPassword = type === 'password';
    const [showPassword, setShowPassword] = useState(false);
    
    const inputType = isPassword && showPassword ? 'text' : type;
    const toggleIcon = showPassword ? 'eye-slash' : 'eye'; // Usando apenas o nome do ícone

    return (
        <div className="relative group">
            <label 
                htmlFor={props.id || props.name} 
                className={`absolute left-12 top-1/2 -translate-y-1/2 text-text-secondary text-sm transition-all duration-200 
                            ${props.value ? 'text-xs -top-2.5 left-4 bg-card px-1' : 'group-focus-within:text-xs group-focus-within:-top-2.5 group-focus-within:left-4 group-focus-within:bg-card group-focus-within:px-1'}
                            ${error ? 'text-red-400' : ''}`}
            >
                {label}
            </label>
            <i className={`fa-solid fa-${icon} absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:${focusRingClass.split(' ')[0].replace('focus:', 'text-')}`}></i>
            <input
                {...props}
                id={props.id || props.name} // Garante que o id exista para o label
                type={inputType}
                className={`w-full bg-card border-2 rounded-full py-3 pl-12 pr-4 text-text-primary placeholder-transparent 
                            ${error ? 'border-red-400 focus:border-red-400 focus:ring-red-400' : `border-card ${focusRingClass}`} 
                            transition-all pt-5`}
                placeholder={label} // Placeholder é necessário para o floating label funcionar
            />
            
            {isPassword && (
                <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors p-1"
                    aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
                >
                    <i className={`fa-solid fa-${toggleIcon} text-xl`}></i>
                </button>
            )}
        </div>
    );
};

export default AuthInput;