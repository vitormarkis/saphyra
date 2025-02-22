## Como gerenciar valores assíncronos dentro de uma store Saphyra?
Toda essa discussão se resume no ciclo de vída desse dado. Se esse dado é assíncrono, é porque ele pertence a outro computador, e o quão sincronizado esse dado precisa estar com esse outro computador, depende da sua necessidade.

## Usando Saphyra
Usando apenas APIs do Saphyra você pode:
- **Por fora**: Delegue a busca do dado para outro agente (componente pai por exemplo), lide com loading lá, e depois que o valor resolver, receba ele como prop e inicialize a store do Saphyra de forma síncrona.
- **Por dentro**: Torne o onConstruct assíncrono e faça a busca dentro dele.
- **De forma lazy**: Comece a store do Saphyra sem o dado e espere até algum componente ler o valor para aí sim disparar a busca. Isso é similar ao o que o useQuery do React Query faz, porém, Saphyra também tem suporte lazy values.
  - Temos esse comportamento no exemplo [External Deps](https://www.saphyra.dev/external-deps) da página do Saphyra, os comentários de cada post são carregados de forma lazy.

Mas existe uma biblioteca especializada em buscar e gerenciar dados assíncronos, e eu não quero expandir Saphyra para esse lado de gerenciamento/sincronização de dados assíncronos, invés de pisar no pé de um gigante, quero me aliar à ele.

### Como aproveitar o React Query
O React Query é uma biblioteca de sincronização e cache de operações assíncronas. Ele provê todo um ferramental robusto e diferentes estratégias para você conseguir sincronizar um dado que muitas vezes mora em outro computador (seu servidor) com o seu navegador. 

React Query separa seu trabalho em queries, cada query é a representação de algum trabalho assíncrono, como por exemplo, a busca de algum dado da API. Ele performa esse trabalho de forma eficiente, deduplicando as operações e cacheado por algum tempo determinado.

Perceba que uma query é um primitivo, você não deveria 

A integração entre os dois, se da registrando listeners no cache do React Query, que ouvem quando uma determinada query muda, rodando um callback que atualiza o store. Simples.


### Quem é a fonte da verdade?
A partir desse momento o valor presente no cache do React Query se torna a fonte de verdade para o valor da store, o que permite você aproveitar todas as estratégias de sincronização usando APIs do React Query, como staleTime, refetchOnWindowFocus, refetchOnMount, refetchInterval, chamando invalidateQueries, etc.

### Em resumo
Se você quiser usar apenas APIs de Saphyra, eu ainda recomendo usar React Query como cache.

Por padrão, use as APIs assíncronas de Saphyra. Se precisar que um dado da sua store esteja sempre sinocronizado com o servidor, use React Query como fonte de verdade.
