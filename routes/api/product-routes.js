const router = require('express').Router();
const { Product, Category, Tag, ProductTag } = require('../../models');

// The `/api/products` endpoint

// get all products
router.get('/', (req, res) => {
  // find all products
  // be sure to include its associated Category and Tag data
    Product.findAll({
      include: [Category, { model: Tag, through: ProductTag }]
    })
    .then((products) => res.status(200).json(products))
    .catch((err) => res.status(500).json(err))
});

// get one product
router.get('/:id', (req, res) => {
  // find a single product by its `id`
  // be sure to include its associated Category and Tag data
    Product.findOne( {where: {id:req.params.id},
      include: [{ model: Category, as: 'category' }, { model: Tag, through: ProductTag }]
    })
    .then((products) => res.status(200).json(products))
    .catch((err) => res.status(500).json(err))
});

// create new product
router.post('/', (req, res) => {
  Product.create(req.body)
    .then((product) => {
      // if there's product tags, we need to create pairings to bulk create in the ProductTag model
      if (req.body.tagIds.length) {
        const productArr = req.body.tagIds.map((tag_id) => {
          return {
            product_id: product.id,
            tag_id,
          };
        });
        return ProductTag.bulkCreate(productArr);
      }
      // if no product tags, just respond
      res.status(200).json(product);
    })
    .then((pTagIds) => res.status(200).json(pTagIds))
    .catch((err) => {
      console.log(err);
      res.status(400).json(err);
    });
});

// update product
router.put('/:id', (req, res) => {
  // update product data
  Product.update(req.body, {
    where: {
      id: req.params.id
    }
  })
  .then((product) =>{
    return ProductTag.findAll({where: {product_id: req.params.id}
  })
  })
  .then((productTag) => {
    const pTagIds = productTag.map(({ tag_id }) => tag_id);
      const newPTags = req.body.tagIds
        .filter((tag_id) => !pTagIds.includes(tag_id))
        .map((tag_id) => {
          return {
            product_id: req.params.id,
            tag_id,
          };
        });
      const pTagsToRemove = productTag
        .filter(({ tag_id }) => !req.body.tagIds.includes(tag_id))
        .map(({ id }) => id);
      return Promise.all([
        ProductTag.destroy({ where: { id: pTagsToRemove } }),
        ProductTag.bulkCreate(newPTags),
      ]);
  })
  .then((product) => res.status(200).json(product))
  .catch((err) => {
    res.status(400).json(err);
  });


});

router.delete('/:id', (req, res) => {
  // delete one product by its `id` value
  try {
    const product = Product.destroy({
      where: {
        id: req.params.id
      }
    });
    if (!product) {
      res.status(404).json({ message: 'No product was found with this ID' });
      return;
    }
    res.status(200).json();
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
