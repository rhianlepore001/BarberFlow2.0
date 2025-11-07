import React from 'react';

interface HeaderProps {
    activeViewLabel: string;
}

const Header: React.FC<HeaderProps> = ({ activeViewLabel }) => {
    return (
        <header className="sticky top-0 z-10 flex h-20 items-center justify-center bg-background-dark/80 p-4 backdrop-blur-sm md:justify-center">
            {/* O Header em mobile pode ter um botão de menu ou de voltar no futuro */}
            <div className="absolute left-4 flex size-12 shrink-0 items-center justify-start md:hidden">
                 {/* Placeholder for potential mobile menu button */}
            </div>
            <h1 className="text-xl font-bold tracking-tight capitalize">{activeViewLabel}</h1>
             <div className="absolute right-4 flex w-12 items-center justify-end md:hidden">
                 {/* Placeholder for potential mobile action button */}
            </div>
        </header>
    );
};

export default Header;
