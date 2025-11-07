# Diretrizes de Desenvolvimento e Stack Tecnológico

Este documento resume o stack tecnológico e as regras de uso de bibliotecas para manter a consistência e a qualidade do projeto BarberFlow Dashboard.

## Stack Tecnológico

*   **Linguagem Principal:** TypeScript.
*   **Framework:** React (com hooks e componentes funcionais).
*   **Estilização:** Tailwind CSS (configurado no `index.html`).
*   **Animações:** Framer Motion.
*   **Backend/Database/Auth:** Supabase (via `@supabase/supabase-js`).
*   **Inteligência Artificial:** Google GenAI (via `@google/genai`).
*   **Ícones:** Material Symbols Outlined (via CDN).
*   **Gerenciamento de Views:** Gerenciamento de estado interno do React (`activeView` no `App.tsx`).

## Regras de Uso de Bibliotecas

| Funcionalidade | Biblioteca/Ferramenta Recomendada | Regras de Uso |
| :--- | :--- | :--- |
| **Estilização** | Tailwind CSS | Use classes utilitárias do Tailwind CSS para todo o design e layout. |
| **Animações** | Framer Motion | Utilize `motion` e `AnimatePresence` para transições de página e animações de componentes. |
| **Ícones** | Material Symbols Outlined | Use a classe `material-symbols-outlined` e o nome do ícone (ex: `content_cut`). |
| **Acesso a Dados/Auth** | Supabase Client (`lib/supabaseClient.ts`) | Todas as operações de CRUD e autenticação devem usar a instância `supabase`. |
| **Geração de Conteúdo IA** | Google GenAI (`@google/genai`) | Use esta biblioteca para todas as interações com modelos de IA (previsões, insights). |
| **Componentes UI** | Componentes Customizados + Tailwind | Crie componentes customizados estilizados com Tailwind. Não há bibliotecas de componentes UI externas (como shadcn/ui) instaladas. |