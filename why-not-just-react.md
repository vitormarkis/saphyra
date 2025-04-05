React 19 é a única alternativa ao Saphyra em questão de proposta de valor.

React é declarativo e na versão 19, adicionou actions que é o mesmo conceito de transitions assíncronas no Saphyra.

Resumindo o que são transitions assíncronas/actions, é a habilidade de você dar fork no seu estado atual, aplicar setagens de estado nessa branch, e quando tudo tiver ok, você da merge da branch no estado principal. Se nem tudo der certo, a branch é descartada e nenhuma alteração é aplicada. Similar com o conceito de transactions em bancos de dados.


### Por que não apenas usar React então?
- Não possui signals para cancelamento de algo assíncrono.
- Async dele são apenas promises. 
