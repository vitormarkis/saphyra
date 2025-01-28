- React é declarativo, sua camada de lógica também deveria ser
- Export APIs em vez de abstrair APIs
- Não derivar loading states de promises
- Leitura de valores em O(1)
  - Se você provê um array para sua árvore de componentes, e 1000 componentes precisam desse array filtrado ou transformado, você terá 1000 iterações sobre o array. Se você derivar os valores que você precisa na hora de definir o estado, você terá 1 iteração sobre o array, e 1000 leituras O(1). **Use componentes para ler valores.**
- Controller global em vez de local
  - Se você gosta de resolver problema dos componentes dentro deles, você terá uma boa dor de cabeça quando um vizinho distante precisar desse mesmo dado.
  (Exemplo: você tem uma aba que lista warnings da feature para o usuário. Você lidou com esse problema de forma local. Agora um novo requirimento chega: você precisa bloquear o botão de save da página se tiver algum warning. O botão de save precisa ter um estado que reflete se existe warnings ou não, boa sorte!)
- Cancelamento first class