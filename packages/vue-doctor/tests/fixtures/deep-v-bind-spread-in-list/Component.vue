<template>
  <ul>
    <Item v-for="item in items" :key="item.id" v-bind="item" />
  </ul>
</template>
