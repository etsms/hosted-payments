# Hosted Payments
Hosted Payments is a comprehensive, browser-based financial transaction toolset,

## Get Started
Visit https://www.etsms.com/docs/hosted-payments
## Credit Cards
![Credit Cards](https://camo.githubusercontent.com/17eb87d57b135fcb669da3fc17c706dece83e3e4/687474703a2f2f696d322e657a6769662e636f6d2f746d702f657a6769662d323638343636353835342e676966)

## Bank Accounts
![Bank Accounts](https://camo.githubusercontent.com/d64451bc76e02c6b38b9d6cf27d97789ed7151b0/687474703a2f2f696d322e657a6769662e636f6d2f746d702f657a6769662d313630373331393631302e676966)

## Customize Payment Acceptance Types
![Acceptance Types](https://camo.githubusercontent.com/805042a42f8e6396a37569ddd002748510c4268a/687474703a2f2f696d322e657a6769662e636f6d2f746d702f657a6769662d333832313537303331392e676966)

### Sample Callback Response (success)

| Name                                   | Value                                                                 |
|----------------------------------------|-----------------------------------------------------------------------|
| status                                 | <span class="string">Success</span>                                   |
| amount                                 | <span class="number">3</span>                                         |
| message                                | <span class="string">transaction processed.</span>                    |
| token                                  | <span class="string">0adc5074-745b-45f6-9d76-1dd43c<wbr>6a7358</span> |
| transaction\_id                        | <span class="string">24829aef-b5ed-4552-af7f-7eeda3<wbr>2d3a9d</span> |
| transaction\_approval\_code            | <span class="string">ETSMS9</span>                                    |
| transaction\_avs\_street\_passed       | <span class="boolean">false</span>                                    |
| transaction\_avs\_postal\_code\_passed | <span class="boolean">false</span>                                    |
| transaction\_currency                  | <span class="string">USD$</span>                                      |
| transaction\_status\_indicator         | <span class="string"></span>                                          |
| correlation\_id                        | <span class="string">0c7e71d2-c92f-4cb6-bc5d-667ae5<wbr>0a3e47</span> |
| instrument\_id                         | <span class="string">16c61db5-6b02-48bd-ab32-9d401d<wbr>0eeb92</span> |
| instrument\_type                       | <span class="string">VISA</span>                                      |
| instrument\_last\_four                 | <span class="string">1111</span>                                      |
| instrument\_expiration\_date           | <span class="string">05/2017</span>                                   |
| instrument\_verification\_method       | <span class="string"></span>                                          |
| instrument\_entry\_mode                | <span class="string">MANUAL</span>                                    |
| instrument\_verification\_results      | <span class="string"></span>                                          |
| created\_on                            | <span class="string">2016-06-02T19:52:39.875Z</span>                  |
| customer\_name                         | <span class="string">Erik Zettersten</span>                           |
| customer\_signature                    | <span class="string">https://images.pmoney.com/0000<wbr>0000</span>   |
| customer\_access\_token                | <span class="string"></span>                                          |
| anti\_forgery\_token                   | <span class="string">3a709f23cd58492a991680d213e4c8<wbr>cf</span>     |
| application\_identifier                | <span class="string">Hosted Payments</span>                           |
| application\_response\_code            | <span class="string"></span>                                          |
| application\_issuer\_data              | <span class="string"></span>                                          |

### Sample Callback Response (error)

| Name        | Value                                                                                          |
|-------------|------------------------------------------------------------------------------------------------|
| status      | <span class="string">Error</span>                                                              |
| message     | <span class="string">ERROR – No response from gateway script. The response code is Z10.</span> |
| created\_on | <span class="string">2016-06-02T19:53:34.286Z</span>                                           |
| token       | <span class="string">7a3e3977-b378-4dea-8e77-7f63c9<wbr>1fc938</span>                          |


## Support
Visit https://www.etsms.com/support
