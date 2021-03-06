# Hosted Payments
Hosted Payments is a comprehensive, browser-based financial transaction toolset

[![](https://data.jsdelivr.com/v1/package/gh/etsms/hosted-payments/badge)](https://www.jsdelivr.com/package/gh/etsms/hosted-payments)

## Get started
Visit https://elavonpayments.com/docs/hp

### Using test card or bank account data
Visit https://elavonpayments.com/docs/hp/test_data

### Import Hosted Payments

```html
<script async src="//cdn.jsdelivr.net/gh/etsms/hosted-payments@latest/dist/jquery.hosted-payments.min.js"></script>
<link href="//cdn.jsdelivr.net/gh/etsms/hosted-payments@latest/dist/jquery.hosted-payments.min.css" rel="stylesheet"/>
```
Note: This package requires **jQuery v3** or greater. To obtain jQuery, please visit their website (https://jquery.com/download/). Or include jQuery with the script above like:

```html
<script async src="//cdn.jsdelivr.net/combine/gh/jquery/jquery@3.2/dist/jquery.min.js,gh/etsms/hosted-payments@latest/dist/jquery.hosted-payments.min.js"></script>
```

## Credit Cards
![Credit Cards](https://github.com/etsms/hosted-payments/blob/gh-pages/CreditCardManualEntry.gif?raw=true)

## Bank Accounts
![Bank Accounts](https://github.com/etsms/hosted-payments/blob/gh-pages/ACHManualEntry.gif?raw=true)

## Swipes & Barcode Scans
![Acceptance Types](https://github.com/etsms/hosted-payments/blob/gh-pages/CreditCardSwipe.gif?raw=true)

## Choose from many payment methods
![Payment Methods](https://github.com/etsms/hosted-payments/blob/gh-pages/PaymentFlowWithTransvault.gif?raw=true)

## Customize and order your payment options
![Payment Options](https://github.com/etsms/hosted-payments/blob/gh-pages/PaymentFlowChangeCroped.gif?raw=true)

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
| instrument\_routing\_last\_four        | <span class="string">0017</span>                                      |
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
Visit https://elavonpayments.com/support
