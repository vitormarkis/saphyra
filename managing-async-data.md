## Como gerenciar valores assíncronos dentro de XXX?
Toda essa discussão se resume no ciclo de vída desse dado. Se esse dado é assíncrono, é porque ele pertence a outro computador, e o quão sincronizado esse dado precisa estar com esse outro computador, depende da sua necessidade.

Você pode buscar esse dado no onConstruct, e ter esse snapshot durante todo o ciclo de vida da store. Ou buscar ele de forma lazy quando um componente montar, ou buscar em um action... Todas essas abordagens são válidas e são uma forma de fazer.

Mas existe uma biblioteca especializada em buscar e gerenciar dados assíncronos, e eu não quero expandir o XXX para esse lado de gerenciamento/sincronização de dados assíncronos. Não quero pisar no pé de um gigante e sim me aliar à ele.

### Integrando com React Query
Acima eu dei alguns exemplo de ciclo de vida de dados assíncronos, mas se você quer que o dado assíncrono da sua store esteja sempre sincronizado com o servidor, não existe solução melhor do que usar React Query.

A integração entre os dois, se da registrando listeners no cache do React Query, que ouvem quando uma determinada query muda, rodando um callback que atualiza o store. Simples.


### Quem é a fonte da verdade?
A partir desse momento o valor presente no cache do React Query se torna a fonte de verdade para o valor da store, o que permite você aproveitar todas as estratégias de sincronização usando APIs do React Query, como staleTime, refetchOnWindowFocus, refetchOnMount, refetchInterval, chamando invalidateQueries, etc.

### Em resumo
Se você quiser usar apenas APIs do XXX, eu ainda recomendo usar React Query como cache.

Por padrão, use as APIs assíncronas do XXX. Se precisar que um dado da sua store esteja sempre sinocronizado com o servidor, use React Query como fonte de verdade.


