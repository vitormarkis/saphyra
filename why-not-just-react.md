React 19 é a única alternativa ao Saphyra em questão de proposta de valor.

React é declarativo e na versão 19, adicionou actions que é o mesmo conceito de transitions assíncronas no Saphyra.

Resumindo o que são transitions assíncronas/actions, é a habilidade de você dar fork no seu estado atual, aplicar setagens de estado nessa branch, e quando tudo tiver ok, você da merge da branch no estado principal. Se nem tudo der certo, a branch é descartada e nenhuma alteração é aplicada. Similar com o conceito de transactions em bancos de dados.


### Por que não apenas usar React então?
- Não possui signals para cancelamento de algo assíncrono.
- Conceito de async deles são apenas promises, no Saphyra é tudo que não é síncrono.
  - O primitivo das transitions do Saphyra é super flexível, você pode usar a mesma lógica pra timers, animações, streams, eventos...
- Se você quer disparar callbacks quando sua feature ta em certo formato, precisa fazer isso com useEffects.
  - O problema do useEffect é que ele só roda depois que as suas dependências forem comitadas, ou seja, você tem uma série de estados intermediários sendo comitados até você conseguir rodar o último useEffect e chegar no formato ideal.
  - Todo esse processo de useEffects reagindo a mudança de estados por useEffects é considerado síncrono, você não consegue optar por não comitar esses estados intermediários ou derivar um loading state.
  - Com Saphyra, toda mudança na store pode ter sido acionada por alguma transition, e se tiver derivações de estado/efeitos colaterais agendados/disparo de eventos assíncronos, tudo acontece em nome da transition, e você consegue fazer esse batch de estado e comitar apenas 1 estado válido.
- O corpo de um componente no React + seus estados, seria o que o reducer do Saphyra é, um lugar onde você deriva sua lógica e garante a validade do estado.
  - O reducer do Saphyra só roda em setStates e em dispatches de actions. A função do componente no React é chamado várias vezes, em re-renders e no processo de reconciliation, o que gera um overhead na hora de declarar sua lógica porque você precisa se preocupar quando a função é chamada, em que 
